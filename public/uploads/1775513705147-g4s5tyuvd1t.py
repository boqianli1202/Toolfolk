#!/usr/bin/env python3
"""Chinese Speaking Clock Alarm - Sakura Dream Edition

Speaks the current time in Mandarin Chinese at a set alarm time,
then repeats every X minutes until stopped.
Supports voice cloning via F5-TTS (your voice speaks the time!).
"""

import customtkinter as ctk
from tkinter import filedialog, messagebox
import subprocess
import threading
import datetime
import json
import os
import sys
import numpy as np

try:
    import sounddevice as sd
    import soundfile as sf
    RECORD_AVAILABLE = True
except ImportError:
    RECORD_AVAILABLE = False

# --- Ensure conda ffmpeg/ffprobe are in PATH (needed by pydub for m4a) ---
_conda_bin = os.path.join(sys.prefix, "bin")
if os.path.isdir(_conda_bin) and _conda_bin not in os.environ.get("PATH", ""):
    os.environ["PATH"] = _conda_bin + os.pathsep + os.environ.get("PATH", "")

# --- Optional: F5-TTS for voice cloning ---
try:
    from f5_tts.api import F5TTS

    F5_AVAILABLE = True
except ImportError:
    F5_AVAILABLE = False

# ─── Config ────────────────────────────────────────────────────────

CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(CONFIG_DIR, "config.json")
CACHE_DIR = os.path.join(CONFIG_DIR, "voice_cache")
LIBRARY_DIR = os.path.join(CONFIG_DIR, "voice_library")
os.makedirs(CACHE_DIR, exist_ok=True)
os.makedirs(LIBRARY_DIR, exist_ok=True)

# Generation quality: 16 steps (~16s) balances speed and quality
# (8 = fast but lower quality, 32 = best but ~46s)
NFE_STEP = 16


def load_config():
    try:
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_config(data):
    try:
        with open(CONFIG_PATH, "w") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Config save error: {e}")


# ─── Chinese number/time helpers ────────────────────────────────────

DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]


def number_to_chinese(n):
    if n == 0:
        return "零"
    if n <= 10:
        return DIGITS[n]
    if n < 20:
        return f"十{DIGITS[n - 10]}" if n > 10 else "十"
    tens, ones = n // 10, n % 10
    if ones == 0:
        return f"{DIGITS[tens]}十"
    return f"{DIGITS[tens]}十{DIGITS[ones]}"


def hour_to_chinese(h):
    if h == 0 or h == 12:
        return "十二"
    if h <= 10:
        return DIGITS[h]
    if h == 11:
        return "十一"
    return number_to_chinese(h)


def time_to_chinese(dt=None):
    if dt is None:
        dt = datetime.datetime.now()
    h24, m = dt.hour, dt.minute

    if h24 < 6:
        period = "凌晨"
    elif h24 < 12:
        period = "上午"
    elif h24 == 12:
        period = "中午"
    elif h24 < 18:
        period = "下午"
    else:
        period = "晚上"

    h12 = h24 % 12 or 12
    hour_str = hour_to_chinese(h12)

    if m == 0:
        return f"现在是{period}{hour_str}点整"
    elif m < 10:
        return f"现在是{period}{hour_str}点零{DIGITS[m]}分"
    else:
        return f"现在是{period}{hour_str}点{number_to_chinese(m)}分"


def time_text_at(dt):
    """Get Chinese time string for a specific datetime."""
    return time_to_chinese(dt)


# ─── Voice Cloner (F5-TTS) ─────────────────────────────────────────

class VoiceCloner:
    """Manages F5-TTS model for voice cloning with pre-generation."""

    def __init__(self):
        self.model = None
        self.ref_audio_path = None
        self.ref_text = ""
        self._model_loading = False
        self._model_ready = False
        self._gen_lock = threading.Lock()
        self._cache = {}  # text -> wav path

    @property
    def is_ready(self):
        return self._model_ready and self.ref_audio_path is not None

    @property
    def status(self):
        if not F5_AVAILABLE:
            return "not_installed"
        if self._model_loading:
            return "loading_model"
        if self._model_ready and self.ref_audio_path:
            return "ready"
        if self.ref_audio_path and not self._model_ready:
            return "model_not_loaded"
        return "no_voice"

    def load_model_async(self):
        if not F5_AVAILABLE or self._model_ready or self._model_loading:
            return
        self._model_loading = True
        threading.Thread(target=self._load_model, daemon=True).start()

    def _load_model(self):
        try:
            import torch
            device = "mps" if torch.backends.mps.is_available() else "cpu"
            print(f"[VoiceCloner] Loading F5-TTS on {device}...")
            self.model = F5TTS(device=device)
            self._model_ready = True
            print("[VoiceCloner] Model ready!")
        except Exception as e:
            print(f"[VoiceCloner] Load failed: {e}")
            self._model_ready = False
        self._model_loading = False

    def set_reference(self, audio_path, ref_text=""):
        # Auto-convert to 24kHz mono WAV (F5-TTS native format) for best quality
        self.ref_audio_path = self._convert_to_wav24k(audio_path)
        self.ref_text = ref_text
        self._cache.clear()
        if not self._model_ready:
            self.load_model_async()

    @staticmethod
    def _convert_to_wav24k(path):
        """Convert any audio to 24kHz mono WAV for optimal F5-TTS quality."""
        if not path or not os.path.isfile(path):
            return path
        out = os.path.join(CACHE_DIR, "ref_24k.wav")
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", path,
                 "-ac", "1", "-ar", "24000", "-sample_fmt", "s16", out],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30,
            )
            if os.path.isfile(out) and os.path.getsize(out) > 0:
                print(f"[VoiceCloner] Converted to 24kHz WAV: {out}")
                return out
        except Exception as e:
            print(f"[VoiceCloner] Conversion failed: {e}, using original")
        return path

    def get_cached(self, text):
        path = self._cache.get(text)
        if path and os.path.isfile(path):
            return path
        return None

    def generate(self, text):
        """Generate cloned voice audio (blocking). Returns wav path or None."""
        if not self.is_ready:
            return None
        with self._gen_lock:
            # Check cache again (another thread may have generated it)
            if text in self._cache:
                return self._cache[text]
            out = os.path.join(CACHE_DIR, f"v_{hash(text) & 0xFFFFFFFF}.wav")
            try:
                print(f"[VoiceCloner] Generating: {text}")
                self.model.infer(
                    ref_file=self.ref_audio_path,
                    ref_text=self.ref_text,
                    gen_text=text,
                    file_wave=out,
                    nfe_step=NFE_STEP,
                )
                self._cache[text] = out
                print(f"[VoiceCloner] Done: {text}")
                return out
            except Exception as e:
                print(f"[VoiceCloner] Error: {e}")
                return None

    def pregenerate_async(self, text, callback=None):
        """Generate in background thread."""
        if not self.is_ready or text in self._cache:
            if callback and text in self._cache:
                callback(self._cache[text])
            return

        def _run():
            path = self.generate(text)
            if callback and path:
                callback(path)

        threading.Thread(target=_run, daemon=True).start()


# ─── Recording Dialog ──────────────────────────────────────────────

RECORD_SCRIPTS = [
    "今天天气很好，现在是北京时间下午三点二十五分，请注意安排好您的时间。",
    "每天早上八点钟，我都会准时起床，然后喝一杯热茶，开始新的一天。",
    "各位同学请注意，现在距离考试结束还有四十五分钟，请抓紧时间完成答卷。",
]
RECORD_SECONDS = 12
RECORD_RATE = 24000


class RecordDialog(ctk.CTkToplevel):
    """Popup dialog for recording voice directly in the app."""

    def __init__(self, parent):
        super().__init__(parent)
        self.title("Record Your Voice")
        self.geometry("400x480")
        self.resizable(False, False)
        self.configure(fg_color="#F5F5F5")
        self.transient(parent)
        self.grab_set()

        self.result_path = None  # set when user saves
        self.result_text = ""
        self._recording = False
        self._audio_frames = []
        self._stream = None
        self._countdown = RECORD_SECONDS
        self._timer_id = None
        self._script_idx = 0

        self._build_ui()
        self.after(100, lambda: self.focus_force())

    def _build_ui(self):
        # Title
        ctk.CTkLabel(
            self, text="Read the script below clearly",
            font=ctk.CTkFont(size=15, weight="bold"),
            text_color="#333333",
        ).pack(pady=(18, 4))

        # Script display
        self._script_var = ctk.StringVar(value=RECORD_SCRIPTS[0])
        script_frame = ctk.CTkFrame(self, fg_color="#FFFFFF", corner_radius=16,
                                     border_width=1, border_color="#EEEEF2")
        script_frame.pack(fill="x", padx=20, pady=8)

        self.script_label = ctk.CTkLabel(
            script_frame, textvariable=self._script_var,
            font=ctk.CTkFont(size=16), text_color="#5B9BD5",
            wraplength=340, justify="center",
        )
        self.script_label.pack(padx=16, pady=14)

        # Script selector
        nav = ctk.CTkFrame(self, fg_color="transparent")
        nav.pack()
        ctk.CTkButton(
            nav, text="< Prev", width=70, height=28, corner_radius=14,
            fg_color="#E0ECFA", text_color="#5B9BD5", hover_color="#D0E4F5",
            font=ctk.CTkFont(size=12), command=self._prev_script,
        ).pack(side="left", padx=4)
        self.script_num = ctk.CTkLabel(
            nav, text="Script 1/3", font=ctk.CTkFont(size=12),
            text_color="#999999",
        )
        self.script_num.pack(side="left", padx=8)
        ctk.CTkButton(
            nav, text="Next >", width=70, height=28, corner_radius=14,
            fg_color="#E0ECFA", text_color="#5B9BD5", hover_color="#D0E4F5",
            font=ctk.CTkFont(size=12), command=self._next_script,
        ).pack(side="left", padx=4)

        # Level meter
        self.level_frame = ctk.CTkFrame(self, fg_color="#EEEEF2", corner_radius=8,
                                         height=18, width=340)
        self.level_frame.pack(padx=30, pady=(14, 2))
        self.level_frame.pack_propagate(False)
        self.level_bar = ctk.CTkFrame(self.level_frame, fg_color="#5B9BD5",
                                       corner_radius=6, width=0, height=14)
        self.level_bar.place(x=2, y=2)

        # Countdown
        self.timer_label = ctk.CTkLabel(
            self, text=f"{RECORD_SECONDS}s remaining",
            font=ctk.CTkFont(size=13), text_color="#C48B9F",
        )
        self.timer_label.pack(pady=(2, 8))

        # Record / Stop button
        self.rec_btn = ctk.CTkButton(
            self, text="  Record", width=180, height=50, corner_radius=25,
            fg_color="#5B9BD5", text_color="white", hover_color="#4A8AC4",
            font=ctk.CTkFont(size=18, weight="bold"),
            command=self._toggle_record,
        )
        self.rec_btn.pack(pady=6)

        # Post-recording buttons (hidden initially)
        self.post_frame = ctk.CTkFrame(self, fg_color="transparent")
        self.play_btn = ctk.CTkButton(
            self.post_frame, text="Play", width=90, height=38, corner_radius=14,
            fg_color="#FFF8F0", text_color="#E8A040", hover_color="#FFF0E0",
            font=ctk.CTkFont(size=13, weight="bold"), command=self._play,
        )
        self.play_btn.pack(side="left", padx=6)
        ctk.CTkButton(
            self.post_frame, text="Re-record", width=100, height=38, corner_radius=14,
            fg_color="#F0F0F0", text_color="#666666", hover_color="#E0E0E0",
            font=ctk.CTkFont(size=13, weight="bold"), command=self._reset,
        ).pack(side="left", padx=6)
        ctk.CTkButton(
            self.post_frame, text="Save", width=90, height=38, corner_radius=14,
            fg_color="#5B9BD5", text_color="#FFFFFF", hover_color="#4A8AC4",
            font=ctk.CTkFont(size=13, weight="bold"), command=self._save,
        ).pack(side="left", padx=6)

        # Status
        self.status = ctk.CTkLabel(
            self, text="Press Record and read the script",
            font=ctk.CTkFont(size=12), text_color="#C48B9F",
        )
        self.status.pack(pady=(8, 12))

    # ── Script navigation ──

    def _prev_script(self):
        self._script_idx = (self._script_idx - 1) % len(RECORD_SCRIPTS)
        self._update_script()

    def _next_script(self):
        self._script_idx = (self._script_idx + 1) % len(RECORD_SCRIPTS)
        self._update_script()

    def _update_script(self):
        self._script_var.set(RECORD_SCRIPTS[self._script_idx])
        self.script_num.configure(
            text=f"Script {self._script_idx + 1}/{len(RECORD_SCRIPTS)}")

    # ── Recording ──

    def _toggle_record(self):
        if self._recording:
            self._stop_record()
        else:
            self._start_record()

    def _start_record(self):
        self._audio_frames = []
        self._countdown = RECORD_SECONDS
        self._recording = True
        self.rec_btn.configure(text="  Stop", fg_color="#E06060",
                                hover_color="#CC5050")
        self.post_frame.pack_forget()
        self.status.configure(text="Recording... read the script now!")
        self.timer_label.configure(text=f"{RECORD_SECONDS}s remaining")

        # Start audio stream
        try:
            self._stream = sd.InputStream(
                samplerate=RECORD_RATE, channels=1, dtype="int16",
                blocksize=2400,  # 100ms blocks
                callback=self._audio_callback,
            )
            self._stream.start()
            self._tick_countdown()
        except Exception as e:
            self._recording = False
            self.rec_btn.configure(text="  Record", fg_color="#E94560",
                                    hover_color="#FF6B81")
            self.status.configure(text=f"Mic error: {e}")

    def _audio_callback(self, indata, frames, time_info, status):
        """Called by sounddevice for each audio block."""
        if self._recording:
            self._audio_frames.append(indata.copy())
            # Update level meter on UI thread
            level = np.abs(indata).mean() / 32768.0
            bar_width = max(2, int(level * 336 * 8))  # Scale for visibility
            bar_width = min(bar_width, 336)
            try:
                self.after(0, lambda w=bar_width: self.level_bar.configure(width=w))
            except Exception:
                pass

    def _tick_countdown(self):
        if not self._recording:
            return
        self._countdown -= 1
        self.timer_label.configure(text=f"{self._countdown}s remaining")
        if self._countdown <= 0:
            self._stop_record()
        else:
            self._timer_id = self.after(1000, self._tick_countdown)

    def _stop_record(self):
        self._recording = False
        if self._stream:
            self._stream.stop()
            self._stream.close()
            self._stream = None
        if self._timer_id:
            self.after_cancel(self._timer_id)
            self._timer_id = None

        self.rec_btn.configure(text="  Record", fg_color="#5B9BD5",
                                hover_color="#4A8AC4")
        self.level_bar.configure(width=0)

        if not self._audio_frames:
            self.status.configure(text="No audio recorded. Try again.")
            return

        # Combine frames
        audio = np.concatenate(self._audio_frames, axis=0)
        duration = len(audio) / RECORD_RATE
        self.timer_label.configure(text=f"Recorded {duration:.1f}s")
        self.status.configure(text="Done! Play to preview, or Save.")

        # Save temp file
        self._temp_path = os.path.join(CACHE_DIR, "_recording_temp.wav")
        sf.write(self._temp_path, audio, RECORD_RATE)

        # Show post-recording buttons
        self.post_frame.pack(pady=4)

    # ── Post-recording ──

    def _play(self):
        if hasattr(self, "_temp_path") and os.path.isfile(self._temp_path):
            threading.Thread(
                target=lambda: subprocess.run(
                    ["afplay", self._temp_path],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL),
                daemon=True,
            ).start()

    def _reset(self):
        self.post_frame.pack_forget()
        self.status.configure(text="Press Record and read the script")
        self.timer_label.configure(text=f"{RECORD_SECONDS}s remaining")
        self._audio_frames = []

    def _save(self):
        if not hasattr(self, "_temp_path") or not os.path.isfile(self._temp_path):
            return
        self.result_path = self._temp_path
        self.result_text = RECORD_SCRIPTS[self._script_idx]
        self.grab_release()
        self.destroy()


# ─── Color Theme: 小宇宙 Light Blue ───────────────────────────────

C = {
    "bg": "#F5F5F5",           # clean light gray background
    "card": "#FFFFFF",          # white cards
    "card_border": "#EEEEF2",   # subtle border
    "clock_text": "#5B9BD5",    # light blue accent
    "date_text": "#999999",     # muted gray
    "label": "#333333",         # dark text for labels
    "input_bg": "#F0F4FA",      # light blue tinted pill bg
    "input_text": "#5B9BD5",    # blue text in pills
    "btn_start_bg": "#5B9BD5",  # blue start button
    "btn_start_fg": "#FFFFFF",  # white text
    "btn_start_h": "#4A8AC4",   # darker blue hover
    "btn_stop_bg": "#F0F0F0",   # neutral gray stop
    "btn_stop_fg": "#666666",
    "btn_stop_h": "#E0E0E0",
    "btn_test_bg": "#FFF8F0",   # warm test button
    "btn_test_fg": "#E8A040",
    "btn_test_h": "#FFF0E0",
    "btn_voice_bg": "#F0F4FA",  # light blue upload
    "btn_voice_fg": "#5B9BD5",
    "btn_voice_h": "#E0ECFA",
    "btn_clear_bg": "#F0F0F0",  # neutral clear
    "btn_clear_fg": "#999999",
    "btn_clear_h": "#E5E5E5",
    "status_bg": "#F0F6FF",     # light blue status
    "status_text": "#999999",
    "accent": "#5B9BD5",        # main accent
    "accent_dark": "#4A8AC4",   # hover accent
    "record_bg": "#5B9BD5",     # record button (blue instead of red)
    "record_h": "#4A8AC4",
}


# ─── App ────────────────────────────────────────────────────────────

class AlarmApp:
    def __init__(self):
        self.cloner = VoiceCloner()
        self.alarm_active = False
        self.alarm_triggered = False
        self._alarm_loop_running = False

        self.root = ctk.CTk()
        self.root.title("报时宝 BaoShiBao")
        self.root.geometry("420x820")
        self.root.minsize(420, 820)
        self.root.maxsize(420, 820)
        self.root.resizable(False, False)
        self.root.configure(fg_color=C["bg"])
        ctk.set_appearance_mode("light")

        self.config = load_config()
        self._build_ui()
        self._apply_saved_config()
        self._update_clock()

    # ── UI ──

    def _build_ui(self):
        # Header
        header = ctk.CTkFrame(self.root, fg_color="transparent")
        header.pack(fill="x", padx=24, pady=(18, 0))
        ctk.CTkLabel(header, text="报时宝",
                      font=ctk.CTkFont(family="PingFang SC", size=24, weight="bold"),
                      text_color="#1A1A1A").pack(side="left")
        ctk.CTkLabel(header, text="  BaoShiBao",
                      font=ctk.CTkFont(family="Helvetica Neue", size=13),
                      text_color="#999999").pack(side="left", pady=(4, 0))

        # Clock circle
        clock_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        clock_frame.pack(fill="x", pady=(8, 4))
        clock_circle = ctk.CTkFrame(
            clock_frame, width=170, height=170, corner_radius=85,
            fg_color=C["accent"], border_width=3, border_color="#D0E4F5")
        clock_circle.pack()
        clock_circle.pack_propagate(False)
        self.clock_label = ctk.CTkLabel(
            clock_circle, text="00:00:00",
            font=ctk.CTkFont(family="Helvetica Neue", size=38, weight="bold"),
            text_color="#FFFFFF")
        self.clock_label.pack(expand=True, pady=(50, 0))
        self.date_label = ctk.CTkLabel(
            clock_circle, text="",
            font=ctk.CTkFont(size=11), text_color="#B8D4EC")
        self.date_label.pack(pady=(0, 50))

        # Settings card
        card = ctk.CTkFrame(self.root, fg_color=C["card"], corner_radius=16,
                            border_width=1, border_color=C["card_border"])
        card.pack(fill="x", padx=16, pady=8)
        self._ui_alarm_row(card)
        self._ui_gap_row(card)
        self._ui_speed_row(card)

        # Voice card + library
        self._ui_voice_card()
        self._ui_voice_library()

        # Buttons
        self._ui_buttons()

        # Status
        self.status_label = ctk.CTkLabel(
            self.root, text="Ready - Set alarm time and press Start",
            font=ctk.CTkFont(size=12), text_color=C["status_text"],
            fg_color=C["status_bg"], corner_radius=12, height=36)
        self.status_label.pack(fill="x", padx=16, pady=(5, 15))

    def _ui_alarm_row(self, card):
        row = ctk.CTkFrame(card, fg_color="transparent")
        row.pack(fill="x", padx=20, pady=(15, 5))
        ctk.CTkLabel(row, text="Alarm Time", font=ctk.CTkFont(size=14),
                      text_color=C["label"]).pack(side="left")
        self.min_var = ctk.StringVar(value="00")
        self.hour_var = ctk.StringVar(value="08")
        kw = dict(width=68, height=32, corner_radius=16, fg_color=C["input_bg"],
                  text_color=C["input_text"], button_color=C["card_border"],
                  button_hover_color=C["btn_stop_bg"],
                  font=ctk.CTkFont(size=15, weight="bold"),
                  dropdown_font=ctk.CTkFont(size=13))
        ctk.CTkOptionMenu(row, variable=self.min_var,
                           values=[f"{i:02d}" for i in range(60)], **kw).pack(side="right")
        ctk.CTkLabel(row, text=":", font=ctk.CTkFont(size=18, weight="bold"),
                      text_color=C["label"]).pack(side="right", padx=4)
        ctk.CTkOptionMenu(row, variable=self.hour_var,
                           values=[f"{i:02d}" for i in range(24)], **kw).pack(side="right")

    def _ui_gap_row(self, card):
        row = ctk.CTkFrame(card, fg_color="transparent")
        row.pack(fill="x", padx=20, pady=5)
        ctk.CTkLabel(row, text="Gap Between", font=ctk.CTkFont(size=14),
                      text_color=C["label"]).pack(side="left")
        ctk.CTkLabel(row, text="sec", font=ctk.CTkFont(size=13),
                      text_color=C["date_text"]).pack(side="right")
        self.gap_var = ctk.StringVar(value="1")
        ctk.CTkOptionMenu(
            row, variable=self.gap_var,
            values=["0", "1", "2", "3", "5", "10", "30", "60"],
            width=68, height=32, corner_radius=16, fg_color=C["input_bg"],
            text_color=C["input_text"], button_color=C["card_border"],
            button_hover_color=C["btn_stop_bg"],
            font=ctk.CTkFont(size=15, weight="bold"),
        ).pack(side="right", padx=(0, 6))

    def _ui_speed_row(self, card):
        row = ctk.CTkFrame(card, fg_color="transparent")
        row.pack(fill="x", padx=20, pady=(5, 15))
        ctk.CTkLabel(row, text="Voice Speed", font=ctk.CTkFont(size=14),
                      text_color=C["label"]).pack(side="left")
        self.speed_var = ctk.IntVar(value=200)
        ctk.CTkSlider(
            row, from_=100, to=300, variable=self.speed_var,
            width=160, height=18, corner_radius=9,
            button_color=C["clock_text"], button_hover_color=C["btn_stop_bg"],
            progress_color=C["btn_stop_bg"], fg_color=C["card_border"],
        ).pack(side="right")

    def _ui_voice_card(self):
        vc = ctk.CTkFrame(self.root, fg_color="#F0F6FF", corner_radius=16,
                           border_width=1, border_color="#E0ECFA")
        vc.pack(fill="x", padx=16, pady=(0, 8))
        inner = ctk.CTkFrame(vc, fg_color="transparent")
        inner.pack(fill="x", padx=20, pady=12)
        self.voice_status_lbl = ctk.CTkLabel(
            inner, text="System voice: Tingting",
            font=ctk.CTkFont(size=12), text_color=C["date_text"], anchor="w")
        self.voice_status_lbl.pack(side="left", fill="x", expand=True)
        self.clear_btn = ctk.CTkButton(
            inner, text="Clear", width=55, height=32, corner_radius=16,
            fg_color=C["btn_clear_bg"], text_color=C["btn_clear_fg"],
            hover_color=C["btn_clear_h"], font=ctk.CTkFont(size=12, weight="bold"),
            command=self._clear_voice)
        ctk.CTkButton(
            inner, text="Upload", width=75, height=32, corner_radius=16,
            fg_color=C["btn_voice_bg"], text_color=C["btn_voice_fg"],
            hover_color=C["btn_voice_h"], font=ctk.CTkFont(size=12, weight="bold"),
            command=self._upload_voice).pack(side="right")

        ctk.CTkButton(
            inner, text="  Record", width=85, height=32, corner_radius=16,
            fg_color=C["record_bg"], text_color="white", hover_color=C["record_h"],
            font=ctk.CTkFont(size=12, weight="bold"),
            command=self._record_voice).pack(side="right", padx=(0, 6))

    def _ui_voice_library(self):
        """Scrollable voice library showing all saved voices."""
        lib_card = ctk.CTkFrame(self.root, fg_color=C["card"], corner_radius=16,
                                 border_width=1, border_color=C["card_border"])
        lib_card.pack(fill="x", padx=16, pady=(0, 2))

        header = ctk.CTkFrame(lib_card, fg_color="transparent")
        header.pack(fill="x", padx=20, pady=(4, 0))
        ctk.CTkLabel(header, text="Voice Library",
                      font=ctk.CTkFont(size=12, weight="bold"),
                      text_color=C["label"]).pack(side="left")

        # Scrollable list of saved voices
        self.lib_frame = ctk.CTkScrollableFrame(
            lib_card, fg_color="transparent", height=28, corner_radius=8)
        self.lib_frame.pack(fill="x", padx=8, pady=(0, 2))

        self._refresh_library()

    def _refresh_library(self):
        """Rebuild the voice library list from disk."""
        for w in self.lib_frame.winfo_children():
            w.destroy()

        voices = self._get_library_voices()
        if not voices:
            ctk.CTkLabel(self.lib_frame, text="No voices saved yet",
                          font=ctk.CTkFont(size=12), text_color=C["date_text"]).pack(pady=4)
            return

        for entry in voices:
            name = entry["name"]
            path = entry["path"]
            ref_text = entry.get("ref_text", "")
            row = ctk.CTkFrame(self.lib_frame, fg_color="transparent")
            row.pack(fill="x", pady=2)

            is_active = (self.cloner.ref_audio_path == path)
            name_color = C["accent"] if is_active else C["label"]

            # Dot indicator
            dot = ctk.CTkFrame(row, width=8, height=8, corner_radius=4,
                                fg_color=C["accent"] if is_active else "#DDD")
            dot.pack(side="left", padx=(0, 8))

            name_btn = ctk.CTkButton(
                row, text=name, width=0, height=26,
                fg_color="transparent", text_color=name_color,
                hover_color=C["card_border"],
                font=ctk.CTkFont(size=12, weight="bold" if is_active else "normal"),
                anchor="w",
                command=lambda n=name: self._rename_library_voice(n),
            )
            name_btn.pack(side="left", fill="x", expand=True)

            if is_active:
                tag = ctk.CTkLabel(row, text="Active", height=20,
                                    font=ctk.CTkFont(size=10, weight="bold"),
                                    text_color=C["accent"], fg_color="#E8F0FA",
                                    corner_radius=8, padx=6)
                tag.pack(side="right", padx=(4, 4))

            ctk.CTkButton(
                row, text="Use", width=40, height=24, corner_radius=12,
                fg_color="transparent" if is_active else C["card"],
                text_color=C["date_text"],
                hover_color=C["card_border"],
                border_width=1, border_color="#E5E5E5",
                font=ctk.CTkFont(size=11),
                command=lambda p=path, t=ref_text: self._use_library_voice(p, t),
            ).pack(side="right", padx=2)

            if not is_active:
                ctk.CTkButton(
                    row, text="Del", width=36, height=24, corner_radius=12,
                    fg_color="transparent", text_color=C["date_text"],
                    hover_color="#F5E5E5", border_width=1, border_color="#E5E5E5",
                    font=ctk.CTkFont(size=11),
                    command=lambda n=name: self._delete_library_voice(n),
                ).pack(side="right", padx=2)

    def _get_library_voices(self):
        """Read voice library metadata."""
        meta_path = os.path.join(LIBRARY_DIR, "voices.json")
        try:
            with open(meta_path, "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return []

    def _save_library_voices(self, voices):
        meta_path = os.path.join(LIBRARY_DIR, "voices.json")
        with open(meta_path, "w") as f:
            json.dump(voices, f, ensure_ascii=False, indent=2)

    def _add_to_library(self, src_path, ref_text=""):
        """Copy voice file into library and save metadata."""
        import shutil
        name = os.path.basename(src_path)
        dest = os.path.join(LIBRARY_DIR, name)
        # Avoid duplicates
        if os.path.exists(dest):
            base, ext = os.path.splitext(name)
            i = 2
            while os.path.exists(dest):
                name = f"{base}_{i}{ext}"
                dest = os.path.join(LIBRARY_DIR, name)
                i += 1
        shutil.copy2(src_path, dest)

        voices = self._get_library_voices()
        voices.append({"name": name, "path": dest, "ref_text": ref_text})
        self._save_library_voices(voices)
        self._refresh_library()

    def _use_library_voice(self, path, ref_text):
        """Switch to a voice from the library."""
        if not os.path.isfile(path):
            messagebox.showerror("Error", "Voice file not found!")
            return
        self.cloner.set_reference(path, ref_text)
        self._refresh_voice_ui()
        self._refresh_library()
        self._save_config()
        self.status_label.configure(
            text=f"Switched to: {os.path.basename(path)}")

    def _rename_library_voice(self, old_name):
        """Rename a voice in the library via popup dialog."""
        base, ext = os.path.splitext(old_name)
        dialog = ctk.CTkInputDialog(
            text=f"Enter new name for:\n{old_name}",
            title="Rename Voice",
        )
        new_name = dialog.get_input()
        if not new_name or new_name.strip() == "":
            return
        new_name = new_name.strip()
        # Keep the original extension
        if not new_name.endswith(ext):
            new_name = new_name + ext

        voices = self._get_library_voices()
        for v in voices:
            if v["name"] == old_name:
                old_path = v["path"]
                new_path = os.path.join(LIBRARY_DIR, new_name)
                try:
                    os.rename(old_path, new_path)
                except OSError:
                    return
                v["name"] = new_name
                v["path"] = new_path
                # Update active reference if this voice is in use
                if self.cloner.ref_audio_path == old_path:
                    self.cloner.ref_audio_path = new_path
                break
        self._save_library_voices(voices)
        self._refresh_library()
        self._refresh_voice_ui()
        self._save_config()

    def _delete_library_voice(self, name):
        """Remove a voice from the library."""
        voices = self._get_library_voices()
        new_voices = []
        for v in voices:
            if v["name"] == name:
                try:
                    os.remove(v["path"])
                except OSError:
                    pass
            else:
                new_voices.append(v)
        self._save_library_voices(new_voices)
        self._refresh_library()

    def _ui_buttons(self):
        bf = ctk.CTkFrame(self.root, fg_color="transparent")
        bf.pack(fill="x", padx=16, pady=(12, 6))
        kw = dict(height=68, corner_radius=18, font=ctk.CTkFont(size=18, weight="bold"))
        self.start_btn = ctk.CTkButton(
            bf, text="Start", fg_color=C["btn_start_bg"], text_color=C["btn_start_fg"],
            hover_color=C["btn_start_h"], command=self._start_alarm, **kw)
        self.start_btn.pack(side="left", expand=True, fill="x", padx=(0, 4))
        self.stop_btn = ctk.CTkButton(
            bf, text="Stop", fg_color=C["btn_stop_bg"], text_color=C["btn_stop_fg"],
            hover_color=C["btn_stop_h"], command=self._stop_alarm, state="disabled", **kw)
        self.stop_btn.pack(side="left", expand=True, fill="x", padx=4)
        self.test_btn = ctk.CTkButton(
            bf, text="Test", fg_color=C["btn_test_bg"], text_color=C["btn_test_fg"],
            hover_color=C["btn_test_h"], command=self._test_speak, **kw)
        self.test_btn.pack(side="left", expand=True, fill="x", padx=(4, 0))

    # ── Config ──

    def _apply_saved_config(self):
        c = self.config
        if "alarm_hour" in c:
            self.hour_var.set(c["alarm_hour"])
        if "alarm_min" in c:
            self.min_var.set(c["alarm_min"])
        if "gap" in c:
            self.gap_var.set(c["gap"])
        if "speed" in c:
            self.speed_var.set(c["speed"])
        if c.get("voice_ref_audio") and os.path.isfile(c["voice_ref_audio"]):
            self.cloner.set_reference(c["voice_ref_audio"], c.get("voice_ref_text", ""))
            self._refresh_voice_ui()

    def _save_config(self):
        save_config({
            "alarm_hour": self.hour_var.get(),
            "alarm_min": self.min_var.get(),
            "gap": self.gap_var.get(),
            "speed": self.speed_var.get(),
            "voice_ref_audio": self.cloner.ref_audio_path or "",
            "voice_ref_text": self.cloner.ref_text or "",
        })

    # ── Clock tick ──

    def _update_clock(self):
        now = datetime.datetime.now()
        self.clock_label.configure(text=now.strftime("%H:%M:%S"))
        self.date_label.configure(text=now.strftime("%Y-%m-%d  %A"))

        # Check alarm trigger
        if self.alarm_active and not self.alarm_triggered:
            try:
                ah, am = int(self.hour_var.get()), int(self.min_var.get())
                if now.hour == ah and now.minute == am:
                    self.alarm_triggered = True
                    self._start_alarm_loop()
            except ValueError:
                pass

        # Refresh voice status while model loads
        if self.cloner._model_loading:
            self._refresh_voice_ui()

        self.root.after(1000, self._update_clock)

    # ── Core: continuous alarm loop ──

    def _start_alarm_loop(self):
        """Start the continuous speaking loop in a background thread."""
        if self._alarm_loop_running:
            return
        self._alarm_loop_running = True
        threading.Thread(target=self._alarm_loop, daemon=True).start()

    def _alarm_loop(self):
        """Keep speaking the time with a gap, until alarm_active is False."""
        last_text = None
        while self.alarm_active:
            text = time_to_chinese()
            rate = self.speed_var.get()
            gap = float(self.gap_var.get())

            # Update status on UI thread
            self.root.after(0, lambda t=text: self.status_label.configure(
                text=f"Speaking: {t}"))

            # If text changed (new minute), generate fresh clone
            if text != last_text and self.cloner.is_ready:
                cached = self.cloner.get_cached(text)
                if not cached:
                    self.root.after(0, lambda: self.status_label.configure(
                        text="Generating your voice for new minute..."))
                    self.cloner.generate(text)
                last_text = text

            # Speak: cloned voice or Tingting
            cached = self.cloner.get_cached(text)
            if cached:
                self._play_wav(cached)
            else:
                self._speak_tingting(text, rate)

            # Check if stopped during speech
            if not self.alarm_active:
                break

            # Wait the gap
            import time as _time
            _time.sleep(gap)

        self._alarm_loop_running = False
        self.root.after(0, lambda: self.status_label.configure(text="Alarm stopped"))

    # ── Audio helpers ──

    def _play_wav(self, path):
        try:
            subprocess.run(["afplay", path], stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, timeout=30)
        except Exception:
            pass

    def _speak_tingting(self, text, rate):
        try:
            subprocess.run(["say", "-v", "Tingting", "-r", str(rate), text],
                           stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        except Exception:
            pass

    # ── Controls ──

    def _start_alarm(self):
        self.alarm_active = True
        self.alarm_triggered = False

        h, m = self.hour_var.get(), self.min_var.get()
        self.start_btn.configure(state="disabled")
        self.stop_btn.configure(state="normal")
        self._save_config()

        # Pre-generate cloned voice for the alarm time NOW
        if self.cloner.is_ready:
            alarm_dt = datetime.datetime.now().replace(
                hour=int(h), minute=int(m), second=0, microsecond=0)
            alarm_text = time_to_chinese(alarm_dt)
            self.cloner.pregenerate_async(alarm_text)
            self.status_label.configure(
                text=f"Alarm {h}:{m} - preparing your voice...")
        else:
            self.status_label.configure(text=f"Alarm set for {h}:{m} - waiting...")

    def _stop_alarm(self):
        self.alarm_active = False
        self.alarm_triggered = False
        # Loop thread will detect alarm_active=False and stop itself
        self.status_label.configure(text="Alarm stopped")
        self.start_btn.configure(state="normal")
        self.stop_btn.configure(state="disabled")

    def _test_speak(self):
        """Test: speak current time once."""
        text = time_to_chinese()
        rate = self.speed_var.get()

        def _do():
            cached = self.cloner.get_cached(text)
            if cached:
                self._play_wav(cached)
            elif self.cloner.is_ready:
                self.root.after(0, lambda: self.status_label.configure(
                    text="Generating your voice (~8s)..."))
                path = self.cloner.generate(text)
                if path:
                    self._play_wav(path)
                else:
                    self._speak_tingting(text, rate)
            else:
                self._speak_tingting(text, rate)
            self.root.after(0, lambda: self.status_label.configure(
                text=f"Spoke: {text}"))

        self.status_label.configure(text=f"Speaking: {text}")
        threading.Thread(target=_do, daemon=True).start()

    # ── Voice record / upload ──

    def _record_voice(self):
        """Open the recording dialog."""
        if not RECORD_AVAILABLE:
            messagebox.showinfo(
                "Record",
                "Recording requires sounddevice.\n\n"
                "Run: pip install sounddevice\n\n"
                "Then restart the app.")
            return
        if not F5_AVAILABLE:
            messagebox.showinfo(
                "Record",
                "Voice cloning requires F5-TTS.\n\n"
                "Run: pip install f5-tts\n"
                "Then restart the app.")
            return

        dialog = RecordDialog(self.root)
        self.root.wait_window(dialog)

        if dialog.result_path and os.path.isfile(dialog.result_path):
            # Save to library with timestamp name
            import shutil
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            name = f"recording_{ts}.wav"
            dest = os.path.join(LIBRARY_DIR, name)
            shutil.copy2(dialog.result_path, dest)

            voices = self._get_library_voices()
            voices.append({"name": name, "path": dest, "ref_text": dialog.result_text})
            self._save_library_voices(voices)

            self.cloner.set_reference(dest, dialog.result_text)
            self._refresh_voice_ui()
            self._refresh_library()
            self._save_config()
            self.status_label.configure(text="Recording saved! Loading model...")
            self._poll_model()

    def _upload_voice(self):
        if not F5_AVAILABLE:
            messagebox.showinfo(
                "Voice Clone",
                "Voice cloning requires F5-TTS.\n\n"
                "Run in terminal:\n"
                "  pip install f5-tts\n"
                "  conda install -c conda-forge ffmpeg\n\n"
                "Then restart the app.")
            return

        path = filedialog.askopenfilename(
            title="Select your voice (10-30s of Chinese speech)",
            filetypes=[("Audio", "*.wav *.mp3 *.m4a *.aac *.ogg *.aiff"),
                       ("All", "*.*")])
        if not path:
            return

        dialog = ctk.CTkInputDialog(
            text="What did you say in the recording?\n"
                 "(Leave blank for auto-detection)\n\n"
                 "Tip: accurate text = better cloning.",
            title="Reference Text")
        ref_text = dialog.get_input() or ""

        # Save to library and activate
        self._add_to_library(path, ref_text)
        self.cloner.set_reference(path, ref_text)
        self._refresh_voice_ui()
        self._refresh_library()
        self._save_config()
        self.status_label.configure(text="Voice saved to library & loading model...")
        self._poll_model()

    def _poll_model(self):
        self._refresh_voice_ui()
        if self.cloner._model_loading:
            self.root.after(1000, self._poll_model)
        elif self.cloner._model_ready:
            self.status_label.configure(text="Voice clone ready! Your voice will be used.")

    def _clear_voice(self):
        self.cloner.ref_audio_path = None
        self.cloner.ref_text = ""
        self.cloner._cache.clear()
        self._refresh_voice_ui()
        self._save_config()
        self.status_label.configure(text="Voice cleared, using Tingting")

    def _refresh_voice_ui(self):
        s = self.cloner.status
        if s == "not_installed":
            txt = "Voice clone: install f5-tts to enable"
        elif s == "loading_model":
            txt = "Loading voice clone model..."
        elif s == "ready":
            txt = f"Voice clone: {os.path.basename(self.cloner.ref_audio_path)}"
        elif s == "model_not_loaded":
            txt = "Voice file set, loading model..."
        else:
            txt = "System voice: Tingting"
        self.voice_status_lbl.configure(text=txt)

        if self.cloner.ref_audio_path:
            self.clear_btn.pack(side="right", padx=(0, 6))
        else:
            self.clear_btn.pack_forget()

    # ── Run ──

    def run(self):
        self.root.lift()
        self.root.attributes("-topmost", True)
        self.root.after(100, lambda: self.root.attributes("-topmost", False))
        self.root.focus_force()
        self.root.mainloop()


if __name__ == "__main__":
    AlarmApp().run()

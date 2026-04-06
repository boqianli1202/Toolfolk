import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Shield, AlertTriangle } from "lucide-react";
import AdminActions from "@/components/AdminActions";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userId = (session.user as { id: string }).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user || user.role !== "admin") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500">You need admin privileges to access this page.</p>
      </div>
    );
  }

  const reports = await prisma.report.findMany({
    include: {
      tool: { select: { id: true, title: true, category: true, authorId: true } },
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const toolCount = await prisma.tool.count();
  const userCount = await prisma.user.count();
  const reportCount = reports.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center gap-3 mb-8">
        <Shield className="h-7 w-7 text-indigo-600" />
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-2xl font-bold text-gray-900">{toolCount}</div>
          <div className="text-sm text-gray-500">Tools</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className="text-2xl font-bold text-gray-900">{userCount}</div>
          <div className="text-sm text-gray-500">Users</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
          <div className={`text-2xl font-bold ${reportCount > 0 ? "text-red-600" : "text-gray-900"}`}>
            {reportCount}
          </div>
          <div className="text-sm text-gray-500">Reports</div>
        </div>
      </div>

      {/* Reports */}
      <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Reports
      </h2>

      {reports.length > 0 ? (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-xl border border-gray-200 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <a
                      href={`/tool/${report.tool.id}`}
                      className="font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      {report.tool.title}
                    </a>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {report.tool.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{report.reason}</p>
                  <p className="text-xs text-gray-400">
                    Reported by {report.user.name} ({report.user.email}) on{" "}
                    {report.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <AdminActions reportId={report.id} toolId={report.tool.id} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-500">No reports. All clear!</p>
        </div>
      )}
    </div>
  );
}

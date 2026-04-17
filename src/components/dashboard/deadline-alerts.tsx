"use client";

interface DeadlineAlert {
  projectId: string;
  projectName: string;
  projectColor: string;
  clientRef: string;
  deadline: string;
  pendingPieces: number;
  daysRemaining: number;
  isOverdue: boolean;
}

interface DeadlineAlertsProps {
  alerts: DeadlineAlert[];
}

export function DeadlineAlerts({ alerts }: DeadlineAlertsProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-900 mb-4">
        Alertas de Prazo
      </h2>
      {alerts.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-sm text-zinc-400">
          Sem alertas
        </div>
      ) : (
        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {alerts.map((alert) => {
            const urgencyClass = alert.isOverdue
              ? "text-red-600"
              : alert.daysRemaining <= 3
                ? "text-amber-600"
                : "text-zinc-700";

            const badgeClass = alert.isOverdue
              ? "bg-red-50 text-red-700 border-red-200"
              : alert.daysRemaining <= 3
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-zinc-50 text-zinc-600 border-zinc-200";

            const deadlineDate = new Date(alert.deadline);
            const formattedDeadline = deadlineDate.toLocaleDateString("pt-PT", {
              day: "2-digit",
              month: "short",
            });

            return (
              <div
                key={alert.projectId}
                className="flex items-center justify-between p-3 rounded-lg border border-zinc-100 bg-white"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: alert.projectColor }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-sm font-medium truncate"
                      style={{ color: alert.projectColor }}
                    >
                      {alert.projectName}
                    </p>
                    <p className="text-[10px] text-zinc-400">
                      {alert.clientRef}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-xs text-zinc-500">
                    {alert.pendingPieces} peça
                    {alert.pendingPieces !== 1 ? "s" : ""}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeClass}`}
                  >
                    {alert.isOverdue
                      ? `${Math.abs(alert.daysRemaining)}d atrasado`
                      : alert.daysRemaining === 0
                        ? "Hoje"
                        : `${alert.daysRemaining}d`}
                  </span>
                  <span className={`text-[10px] ${urgencyClass}`}>
                    {formattedDeadline}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

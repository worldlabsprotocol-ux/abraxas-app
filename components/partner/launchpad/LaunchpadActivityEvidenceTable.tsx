"use client";

import { ABRAXAS_FONT_MONO, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { useLaunchpadOperational, type LaunchpadActivitySelection } from "@/components/partner/launchpad/launchpadOperationalContext";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function LaunchpadActivityEvidenceTable({
  events,
}: {
  events: LaunchpadActivitySelection[];
}) {
  const { selectedActivity, setSelectedActivity } = useLaunchpadOperational();

  if (!events.length) {
    return (
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0 }}>
        No integration activity recorded yet. This is not the same as telemetry unavailable.
      </p>
    );
  }

  return (
    <div className="abx-launchpad-table-wrap">
      <table className="abx-launchpad-table" aria-label="Integration activity">
        <thead>
          <tr>
            <th scope="col">Event</th>
            <th scope="col">Code</th>
            <th scope="col">When</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => {
            const rowKey = event.id ?? `${event.event_type}-${index}`;
            const selected = selectedActivity?.id === event.id
              || (selectedActivity?.event_type === event.event_type && selectedActivity?.created_at === event.created_at);
            return (
              <tr
                key={rowKey}
                tabIndex={0}
                aria-selected={selected}
                className={selected ? "abx-launchpad-table__row--selected" : undefined}
                onClick={() => setSelectedActivity(event)}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                    keyboardEvent.preventDefault();
                    setSelectedActivity(event);
                  }
                }}
              >
                <td>{event.event_type.replace(/_/g, " ")}</td>
                <td style={{ fontFamily: MONO, fontSize: "0.62rem" }}>{event.public_code ?? "N/A"}</td>
                <td style={{ fontFamily: MONO, fontSize: "0.62rem" }}>{event.created_at ?? "N/A"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

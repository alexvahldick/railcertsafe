"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type EventSummary = {
  id: string;
  controlNumber: string;
  eventDate: string;
  status: string;
  notificationStatus: string;
  employeeLabel: string;
  rowCount: number;
};

type Props = {
  events: EventSummary[];
};

export function TestingEventsList({ events }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statuses = useMemo(
    () => Array.from(new Set(events.map((event) => event.status))).sort(),
    [events],
  );

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesQuery =
        !needle ||
        `${event.controlNumber} ${event.employeeLabel} ${event.notificationStatus} ${event.status}`
          .toLowerCase()
          .includes(needle);
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [events, query, statusFilter]);

  return (
    <section className="panel" style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
      <div className="form-two-col">
        <label className="field-label">
          <span>Search</span>
          <input
            className="field-input"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Control #, employee, status"
            value={query}
          />
        </label>
        <label className="field-label">
          <span>Status</span>
          <select className="field-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="text-muted">
        Showing {filteredEvents.length} of {events.length} testing events
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Control #</th>
              <th>Date</th>
              <th>Status</th>
              <th>Notification</th>
              <th>Employee</th>
              <th>Rows</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted">No testing events match the current filters.</td>
              </tr>
            ) : filteredEvents.map((event) => (
              <tr key={event.id}>
                <td><Link href={`/testing/${event.id}`}>{event.controlNumber}</Link></td>
                <td>{event.eventDate}</td>
                <td>{event.status.replace(/_/g, " ")}</td>
                <td>{event.notificationStatus}</td>
                <td>{event.employeeLabel}</td>
                <td>{event.rowCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

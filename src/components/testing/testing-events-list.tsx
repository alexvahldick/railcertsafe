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

function statusClass(status: string) {
  if (["review_hold_employee_status", "correction_requested"].includes(status)) return "status-needs_review";
  if (status === "submitted_notification_pending") return "status-pending";
  if (status === "amended_effective") return "status-received";
  if (status === "submitted_complete") return "status-validated";
  return "status-received";
}

function actionLabel(event: EventSummary) {
  if (event.status === "review_hold_employee_status") return "Review hold";
  if (event.status === "correction_requested") return "Apply amendment";
  if (event.status === "submitted_notification_pending") return "Complete notification";
  return "Open record";
}

export function TestingEventsList({ events }: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const statuses = useMemo(() => Array.from(new Set(events.map((event) => event.status))).sort(), [events]);

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesQuery =
        !needle ||
        `${event.controlNumber} ${event.employeeLabel} ${event.notificationStatus} ${event.status}`.toLowerCase().includes(needle);
      const matchesStatus = statusFilter === "all" || event.status === statusFilter;
      return matchesQuery && matchesStatus;
    });
  }, [events, query, statusFilter]);

  return (
    <section className="panel operations-card">
      <div className="operations-card-header">
        <div>
          <div className="eyebrow">Search & Filter</div>
          <h2 className="operations-card-title">Testing records and exception status</h2>
        </div>
      </div>

      <div className="operations-filter-grid">
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
          <select className="field-select" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="operations-list-meta">
        Showing {filteredEvents.length} of {events.length} testing events
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="data-table operations-table">
          <thead>
            <tr>
              <th>Control #</th>
              <th>Date</th>
              <th>Status</th>
              <th>Notification</th>
              <th>Employee</th>
              <th>Rows</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td className="text-muted" colSpan={7}>No testing events match the current filters.</td>
              </tr>
            ) : (
              filteredEvents.map((event) => (
                <tr key={event.id}>
                  <td>
                    <Link className="operations-table-link" href={`/testing/${event.id}`}>
                      {event.controlNumber}
                    </Link>
                  </td>
                  <td>{event.eventDate}</td>
                  <td><span className={`status-pill ${statusClass(event.status)}`}>{event.status.replace(/_/g, " ")}</span></td>
                  <td><span className={`status-pill ${event.notificationStatus === "completed" ? "status-validated" : "status-pending"}`}>{event.notificationStatus}</span></td>
                  <td>{event.employeeLabel}</td>
                  <td>{event.rowCount}</td>
                  <td>{actionLabel(event)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

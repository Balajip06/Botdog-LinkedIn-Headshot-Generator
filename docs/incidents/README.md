# Incidents

**Last updated:** 2026-05-29

This folder holds postmortems for production incidents on Trendly. One file per incident. The folder exists in git so the directory layout is stable before the first incident, and so the seller — and later the buyer — has a discoverable place to start.

---

## Naming

`YYYY-MM-DD-<short-slug>.md`

Examples:

- `2026-06-12-stripe-webhook-backlog.md`
- `2026-07-03-gemini-quota-exhausted.md`
- `2026-08-22-edge-function-cold-start-spike.md`

The date is the **day the incident started**, not the day the postmortem was written.

---

## Template

Use the postmortem template embedded in [`docs/sops/incident_response.md`](../sops/incident_response.md). The shape is:

1. **Summary** — one paragraph.
2. **Impact** — who was affected, how badly, for how long.
3. **Timeline** — UTC timestamps, what happened in what order.
4. **Root cause** — the actual root, not a symptom.
5. **What worked** — detection, mitigation, recovery that went well.
6. **What didn't** — gaps in detection, runbook, or design.
7. **Action items** — concrete fixes with owners and due dates.

Severity classification, paging rules, and the comms playbook all live in the SOP.

---

## Status as of 2026-05-29

**No incidents yet.** The product is pre-launch on `main@HEAD`. The first incident will be filed here on its day. We're setting the bar that every sev-1 and sev-2 gets a postmortem, including ones the user never noticed — internal-only is fine; the discipline matters more than the audience.

---

## Cross-references

- [`docs/sops/incident_response.md`](../sops/incident_response.md) — the SOP that produces these files.
- [`docs/data-room/README.md`](../data-room/README.md) — `07-runbooks/incidents-log.md` points back here.
- [`docs/ARCHITECTURE.md`](../ARCHITECTURE.md) — system invariants whose violations would constitute an incident.

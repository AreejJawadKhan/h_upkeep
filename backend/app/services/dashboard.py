from __future__ import annotations

from collections import defaultdict
from datetime import date as date_type, timedelta

from sqlalchemy.orm import Session, joinedload

from app.core.time import utc_now
from app.models.asset import Asset
from app.models.home import Home
from app.models.maintenance import MaintenanceRecord
from app.models.maintenance_document import MaintenanceDocument
from app.models.maintenance_schedule import MaintenanceSchedule
from app.models.warranty import Warranty
from app.schemas.dashboard import (
    DashboardActivityItem,
    DashboardHomeHealthItem,
    DashboardOverviewResponse,
    DashboardUpcomingItem,
    DashboardWarrantyAlert,
)
from app.services.analytics import get_spending_overview
from app.services.home import get_home, get_homes

UPCOMING_WINDOW_DAYS = 30
WARRANTY_ALERT_WINDOW_DAYS = 60
RECENT_ACTIVITY_LIMIT = 10


def _home_scope(
    db: Session,
    *,
    user_id: int,
    home_id: int | None,
) -> tuple[list[Home], Home | None] | None:
    if home_id is not None:
        home = get_home(db=db, home_id=home_id, user_id=user_id)
        if home is None:
            return None
        return [home], home

    homes = get_homes(db=db, user_id=user_id)
    return homes, None


def _due_status(due_date: date_type | None, today: date_type, soon_cutoff: date_type) -> str:
    if due_date is None:
        return "on_track"
    if due_date < today:
        return "overdue"
    if due_date <= soon_cutoff:
        return "due_soon"
    return "on_track"


def _money_line(cost: float, extra: str | None = None) -> str:
    amount = f"${cost:,.2f}"
    return f"{amount} · {extra}" if extra else amount


def get_dashboard_overview(
    db: Session,
    *,
    user_id: int,
    home_id: int | None = None,
) -> DashboardOverviewResponse | None:
    scoped = _home_scope(db, user_id=user_id, home_id=home_id)
    if scoped is None:
        return None

    homes, scope_home = scoped
    home_ids = [home.id for home in homes]
    today = utc_now().date()
    upcoming_cutoff = today + timedelta(days=UPCOMING_WINDOW_DAYS)
    warranty_cutoff = today + timedelta(days=WARRANTY_ALERT_WINDOW_DAYS)

    spending = get_spending_overview(db=db, user_id=user_id, home_id=home_id)
    if home_id is not None and spending is None:
        return None

    assets = (
        db.query(Asset)
        .filter(
            Asset.home_id.in_(home_ids),
        )
        .all()
    )
    records = (
        db.query(MaintenanceRecord)
        .options(
            joinedload(MaintenanceRecord.home),
            joinedload(MaintenanceRecord.asset),
        )
        .filter(
            MaintenanceRecord.user_id == user_id,
            MaintenanceRecord.home_id.in_(home_ids),
        )
        .order_by(MaintenanceRecord.created_at.desc(), MaintenanceRecord.id.desc())
        .all()
    )
    schedules = (
        db.query(MaintenanceSchedule)
        .options(
            joinedload(MaintenanceSchedule.home),
            joinedload(MaintenanceSchedule.asset),
        )
        .filter(
            MaintenanceSchedule.user_id == user_id,
            MaintenanceSchedule.home_id.in_(home_ids),
        )
        .order_by(MaintenanceSchedule.created_at.desc(), MaintenanceSchedule.id.desc())
        .all()
    )
    warranties = (
        db.query(Warranty)
        .options(
            joinedload(Warranty.home),
            joinedload(Warranty.asset),
            joinedload(Warranty.document),
        )
        .filter(
            Warranty.user_id == user_id,
            Warranty.home_id.in_(home_ids),
        )
        .order_by(Warranty.created_at.desc(), Warranty.id.desc())
        .all()
    )
    documents = (
        db.query(MaintenanceDocument)
        .options(
            joinedload(MaintenanceDocument.maintenance).joinedload(MaintenanceRecord.home),
            joinedload(MaintenanceDocument.maintenance).joinedload(MaintenanceRecord.asset),
        )
        .join(MaintenanceRecord, MaintenanceDocument.maintenance_id == MaintenanceRecord.id)
        .filter(
            MaintenanceDocument.user_id == user_id,
            MaintenanceRecord.home_id.in_(home_ids),
        )
        .order_by(MaintenanceDocument.created_at.desc(), MaintenanceDocument.id.desc())
        .all()
    )

    home_lookup = {home.id: home for home in homes}
    asset_count_by_home: dict[int, int] = defaultdict(int)
    record_count_by_home: dict[int, int] = defaultdict(int)
    schedule_count_by_home: dict[int, int] = defaultdict(int)
    warranty_count_by_home: dict[int, int] = defaultdict(int)
    due_soon_by_home: dict[int, int] = defaultdict(int)
    overdue_by_home: dict[int, int] = defaultdict(int)
    expiring_soon_by_home: dict[int, int] = defaultdict(int)
    expired_warranty_by_home: dict[int, int] = defaultdict(int)

    for asset in assets:
        asset_count_by_home[asset.home_id] += 1

    upcoming_items: list[DashboardUpcomingItem] = []
    for record in records:
        record_count_by_home[record.home_id] += 1
        status = _due_status(record.next_due_date, today, upcoming_cutoff)
        if status == "overdue":
            overdue_by_home[record.home_id] += 1
        elif status == "due_soon":
            due_soon_by_home[record.home_id] += 1
        if record.next_due_date is None:
            continue
        upcoming_items.append(
            DashboardUpcomingItem(
                kind="maintenance",
                title=record.title,
                description=f"{record.category} · {record.item}",
                due_date=record.next_due_date,
                home_id=record.home_id,
                home_name=record.home.name if record.home else "",
                asset_id=record.asset_id,
                asset_name=record.asset.name if record.asset else None,
                status=status,  # type: ignore[arg-type]
                source_id=record.id,
            )
        )

    for schedule in schedules:
        schedule_count_by_home[schedule.home_id] += 1
        status = _due_status(schedule.next_due_date, today, upcoming_cutoff)
        if status == "overdue":
            overdue_by_home[schedule.home_id] += 1
        elif status == "due_soon":
            due_soon_by_home[schedule.home_id] += 1
        if schedule.next_due_date is None:
            continue
        upcoming_items.append(
            DashboardUpcomingItem(
                kind="schedule",
                title=schedule.title,
                description=f"{schedule.frequency.replace('_', ' ')} schedule",
                due_date=schedule.next_due_date,
                home_id=schedule.home_id,
                home_name=schedule.home.name if schedule.home else "",
                asset_id=schedule.asset_id,
                asset_name=schedule.asset.name if schedule.asset else None,
                status=status,  # type: ignore[arg-type]
                source_id=schedule.id,
            )
        )

    warranty_alerts: list[DashboardWarrantyAlert] = []
    for warranty in warranties:
        warranty_count_by_home[warranty.home_id] += 1
        if warranty.expiration_date < today:
            expired_warranty_by_home[warranty.home_id] += 1
            warranty_alerts.append(
                DashboardWarrantyAlert(
                    status="expired",
                    provider=warranty.provider,
                    asset_name=warranty.asset.name if warranty.asset else "Asset",
                    home_id=warranty.home_id,
                    home_name=warranty.home.name if warranty.home else "",
                    expiration_date=warranty.expiration_date,
                    source_id=warranty.id,
                    document_id=warranty.document_id,
                )
            )
        elif warranty.expiration_date <= warranty_cutoff:
            expiring_soon_by_home[warranty.home_id] += 1
            warranty_alerts.append(
                DashboardWarrantyAlert(
                    status="expiring_soon",
                    provider=warranty.provider,
                    asset_name=warranty.asset.name if warranty.asset else "Asset",
                    home_id=warranty.home_id,
                    home_name=warranty.home.name if warranty.home else "",
                    expiration_date=warranty.expiration_date,
                    source_id=warranty.id,
                    document_id=warranty.document_id,
                )
            )

    activity_items: list[DashboardActivityItem] = []
    for record in records:
        activity_items.append(
            DashboardActivityItem(
                kind="maintenance",
                title=record.title,
                description=_money_line(record.cost, record.service_provider or record.category),
                timestamp=record.created_at,
                home_id=record.home_id,
                home_name=record.home.name if record.home else "",
                asset_id=record.asset_id,
                asset_name=record.asset.name if record.asset else None,
                source_id=record.id,
            )
        )
    for schedule in schedules:
        activity_items.append(
            DashboardActivityItem(
                kind="schedule",
                title=schedule.title,
                description=f"Created {schedule.frequency.replace('_', ' ')} schedule",
                timestamp=schedule.created_at,
                home_id=schedule.home_id,
                home_name=schedule.home.name if schedule.home else "",
                asset_id=schedule.asset_id,
                asset_name=schedule.asset.name if schedule.asset else None,
                source_id=schedule.id,
            )
        )
    for document in documents:
        activity_items.append(
            DashboardActivityItem(
                kind="document",
                title=document.file_name,
                description=f"Attached to {document.maintenance.title}",
                timestamp=document.created_at,
                home_id=document.maintenance.home_id,
                home_name=document.maintenance.home.name if document.maintenance.home else "",
                asset_id=document.maintenance.asset_id,
                asset_name=document.maintenance.asset.name if document.maintenance.asset else None,
                source_id=document.id,
            )
        )
    for warranty in warranties:
        activity_items.append(
            DashboardActivityItem(
                kind="warranty",
                title=warranty.provider,
                description=f"Warranty linked to {warranty.asset.name if warranty.asset else 'asset'}",
                timestamp=warranty.created_at,
                home_id=warranty.home_id,
                home_name=warranty.home.name if warranty.home else "",
                asset_id=warranty.asset_id,
                asset_name=warranty.asset.name if warranty.asset else None,
                source_id=warranty.id,
            )
        )
    activity_items.sort(key=lambda item: item.timestamp, reverse=True)

    home_health: list[DashboardHomeHealthItem] = []
    for home in homes:
        due_soon_count = due_soon_by_home.get(home.id, 0)
        overdue_count = overdue_by_home.get(home.id, 0)
        expiring_soon_count = expiring_soon_by_home.get(home.id, 0)
        expired_warranty_count = expired_warranty_by_home.get(home.id, 0)

        if overdue_count or expired_warranty_count:
            status_label = "Attention"
        elif due_soon_count or expiring_soon_count:
            status_label = "Watch"
        else:
            status_label = "Healthy"

        summary_parts = []
        if overdue_count:
            summary_parts.append(f"{overdue_count} overdue")
        if due_soon_count:
            summary_parts.append(f"{due_soon_count} due soon")
        if expired_warranty_count:
            summary_parts.append(f"{expired_warranty_count} expired warranty")
        if expiring_soon_count:
            summary_parts.append(f"{expiring_soon_count} expiring soon")
        if not summary_parts:
            summary_parts.append("No urgent items")

        home_health.append(
            DashboardHomeHealthItem(
                home_id=home.id,
                home_name=home.name,
                asset_count=asset_count_by_home.get(home.id, 0),
                maintenance_record_count=record_count_by_home.get(home.id, 0),
                schedule_count=schedule_count_by_home.get(home.id, 0),
                warranty_count=warranty_count_by_home.get(home.id, 0),
                due_soon_count=due_soon_count,
                overdue_count=overdue_count,
                expiring_soon_count=expiring_soon_count,
                expired_warranty_count=expired_warranty_count,
                status_label=status_label,
                summary=", ".join(summary_parts),
            )
        )

    home_health.sort(
        key=lambda item: (
            0 if item.status_label == "Attention" else 1 if item.status_label == "Watch" else 2,
            item.home_name.lower(),
        )
    )
    upcoming_items.sort(
        key=lambda item: (
            item.due_date or date_type.max,
            0 if item.status == "overdue" else 1,
            item.source_id,
        )
    )
    warranty_alerts.sort(
        key=lambda item: (
            item.expiration_date,
            0 if item.status == "expired" else 1,
            item.source_id,
        )
    )

    return DashboardOverviewResponse(
        scope_home_id=scope_home.id if scope_home else None,
        scope_home_name=scope_home.name if scope_home else None,
        home_count=len(homes),
        asset_count=len(assets),
        maintenance_record_count=len(records),
        schedule_count=len(schedules),
        warranty_count=len(warranties),
        due_soon_count=sum(1 for item in upcoming_items if item.status == "due_soon"),
        overdue_count=sum(1 for item in upcoming_items if item.status == "overdue"),
        expiring_soon_count=sum(1 for item in warranty_alerts if item.status == "expiring_soon"),
        expired_warranty_count=sum(1 for item in warranty_alerts if item.status == "expired"),
        total_spend=spending.total_spend,
        this_month_spend=spending.this_month_spend,
        this_year_spend=spending.this_year_spend,
        average_cost=spending.average_cost,
        upcoming_maintenance=upcoming_items[:8],
        warranty_alerts=warranty_alerts[:8],
        recent_activity=activity_items[:10],
        home_health=home_health,
        spending=spending,
    )

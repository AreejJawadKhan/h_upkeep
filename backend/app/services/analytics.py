from __future__ import annotations

from collections import defaultdict
from datetime import date as date_type

from sqlalchemy.orm import Session, joinedload

from app.core.time import utc_now
from app.models.home import Home
from app.models.maintenance import MaintenanceRecord
from app.schemas.analytics import (
    SpendingAssetSummary,
    SpendingCategorySummary,
    SpendingOverviewResponse,
    SpendingPeriodSummary,
    SpendingRecordSummary,
)
from app.services.home import get_home


def _month_start(value: date_type) -> date_type:
    return value.replace(day=1)


def _shift_month(base: date_type, delta: int) -> date_type:
    month = base.month - 1 + delta
    year = base.year + month // 12
    month = month % 12 + 1
    return date_type(year, month, 1)


def _previous_12_month_starts(today: date_type) -> list[date_type]:
    current = _month_start(today)
    return [_shift_month(current, delta) for delta in range(-11, 1)]


def _format_month_label(value: date_type) -> str:
    return value.strftime("%b %Y")


def _load_records(
    db: Session,
    *,
    user_id: int,
    home_id: int | None,
) -> tuple[list[MaintenanceRecord], Home | None]:
    home = None
    query = (
        db.query(MaintenanceRecord)
        .options(
            joinedload(MaintenanceRecord.home),
            joinedload(MaintenanceRecord.asset),
        )
        .filter(MaintenanceRecord.user_id == user_id)
    )

    if home_id is not None:
        home = get_home(db=db, home_id=home_id, user_id=user_id)
        if home is None:
            return [], None
        query = query.filter(MaintenanceRecord.home_id == home_id)

    records = query.order_by(MaintenanceRecord.date.desc(), MaintenanceRecord.id.desc()).all()
    return records, home


def get_spending_overview(
    db: Session,
    *,
    user_id: int,
    home_id: int | None = None,
) -> SpendingOverviewResponse | None:
    records, home = _load_records(db, user_id=user_id, home_id=home_id)
    if home_id is not None and home is None:
        return None

    today = utc_now().date()
    current_year = today.year
    previous_year = current_year - 1

    total_spend = sum(record.cost for record in records)
    this_month_spend = sum(
        record.cost
        for record in records
        if record.date.year == today.year and record.date.month == today.month
    )
    this_year_spend = sum(record.cost for record in records if record.date.year == current_year)
    previous_year_spend = sum(record.cost for record in records if record.date.year == previous_year)
    average_cost = total_spend / len(records) if records else 0.0

    monthly_totals: dict[str, dict[str, float | int]] = {
        _format_month_label(month): {"total_spend": 0.0, "record_count": 0}
        for month in _previous_12_month_starts(today)
    }
    category_totals: dict[str, dict[str, float | int]] = defaultdict(
        lambda: {"total_spend": 0.0, "record_count": 0}
    )
    asset_totals: dict[tuple[int | None, str], dict[str, float | int]] = defaultdict(
        lambda: {"total_spend": 0.0, "record_count": 0}
    )

    for record in records:
        month_label = _format_month_label(_month_start(record.date))
        if month_label in monthly_totals:
            monthly_totals[month_label]["total_spend"] = float(monthly_totals[month_label]["total_spend"]) + record.cost
            monthly_totals[month_label]["record_count"] = int(monthly_totals[month_label]["record_count"]) + 1

        category_bucket = category_totals[record.category]
        category_bucket["total_spend"] = float(category_bucket["total_spend"]) + record.cost
        category_bucket["record_count"] = int(category_bucket["record_count"]) + 1

        asset_id = record.asset_id
        asset_name = record.asset.name if record.asset else "Unassigned"
        asset_bucket = asset_totals[(asset_id, asset_name)]
        asset_bucket["total_spend"] = float(asset_bucket["total_spend"]) + record.cost
        asset_bucket["record_count"] = int(asset_bucket["record_count"]) + 1

    monthly_trend = [
        SpendingPeriodSummary(
            label=label,
            total_spend=round(float(bucket["total_spend"]), 2),
            record_count=int(bucket["record_count"]),
        )
        for label, bucket in monthly_totals.items()
    ]

    category_breakdown = [
        SpendingCategorySummary(
            category=category,
            total_spend=round(float(bucket["total_spend"]), 2),
            record_count=int(bucket["record_count"]),
        )
        for category, bucket in sorted(
            category_totals.items(),
            key=lambda item: (-float(item[1]["total_spend"]), item[0].lower()),
        )
    ]

    asset_breakdown = [
        SpendingAssetSummary(
            asset_id=asset_id,
            asset_name=asset_name,
            total_spend=round(float(bucket["total_spend"]), 2),
            record_count=int(bucket["record_count"]),
        )
        for (asset_id, asset_name), bucket in sorted(
            asset_totals.items(),
            key=lambda item: (-float(item[1]["total_spend"]), item[0][1].lower()),
        )[:8]
    ]

    recent_records = [
        SpendingRecordSummary(
            id=record.id,
            title=record.title,
            date=record.date,
            category=record.category,
            cost=record.cost,
            service_provider=record.service_provider,
            home_id=record.home_id,
            home_name=record.home.name if record.home else "",
            asset_id=record.asset_id,
            asset_name=record.asset.name if record.asset else None,
            created_at=record.created_at,
        )
        for record in records[:8]
    ]

    return SpendingOverviewResponse(
        scope_home_id=home.id if home else None,
        scope_home_name=home.name if home else None,
        total_spend=round(total_spend, 2),
        this_month_spend=round(this_month_spend, 2),
        this_year_spend=round(this_year_spend, 2),
        previous_year_spend=round(previous_year_spend, 2),
        average_cost=round(average_cost, 2),
        record_count=len(records),
        monthly_trend=monthly_trend,
        category_breakdown=category_breakdown,
        asset_breakdown=asset_breakdown,
        recent_records=recent_records,
    )

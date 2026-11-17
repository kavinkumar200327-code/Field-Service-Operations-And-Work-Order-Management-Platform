from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.enums import (
    UserRole,
    CustomerType,
    CustomerStatus,
    EmploymentStatus,
    TechnicianAvailabilityStatus,
    PriorityLevel,
    ServiceRequestStatus,
    WorkOrderStatus,
    PartStatus,
    NotificationType,
)
from app.models.user import Role, User
from app.models.customer import Customer
from app.models.technician import Technician, TechnicianSkill, TechnicianAvailability
from app.models.service import ServiceCategory, Service
from app.models.service_request import ServiceRequest
from app.models.work_order import WorkOrder, WorkOrderStatusHistory, WorkOrderAssignment
from app.models.inventory import Part, InventoryTransaction, WorkOrderPart
from app.models.service_report import ServiceReport
from app.models.feedback import Feedback
from app.models.notification import Notification

def get_utc_now():
    return datetime.now(timezone.utc)

def seed_database():
    db: Session = SessionLocal()
    try:
        # Check if already seeded
        admin_check = db.query(User).filter(User.email == "admin@servisync.com").first()
        if admin_check:
            print("Database already contains seed data. Skipping.")
            return

        print("Seeding database with comprehensive enterprise demo data...")

        # 1. Create Roles
        roles_data = [
            ("SUPER_ADMIN", "Full system configuration and user management access."),
            ("OPERATIONS_MANAGER", "Operational monitoring, team performance, and reporting."),
            ("DISPATCHER", "Work order scheduling, technician allocation, and conflict management."),
            ("FIELD_TECHNICIAN", "Mobile field execution, parts logging, and service report creation."),
            ("CUSTOMER", "Self-service request submission, appointment tracking, and review submission."),
        ]
        for name, desc in roles_data:
            db.add(Role(name=name, description=desc))

        # 2. Create Users
        users = {
            "admin": User(
                email="admin@servisync.com",
                password_hash=get_password_hash("Admin@123"),
                full_name="Edward Sterling (Super Admin)",
                phone="+1 (555) 019-2831",
                role=UserRole.SUPER_ADMIN.value,
            ),
            "manager": User(
                email="manager@servisync.com",
                password_hash=get_password_hash("Manager@123"),
                full_name="Marcus Vance (Operations Manager)",
                phone="+1 (555) 014-9922",
                role=UserRole.OPERATIONS_MANAGER.value,
            ),
            "dispatcher": User(
                email="dispatcher@servisync.com",
                password_hash=get_password_hash("Dispatcher@123"),
                full_name="Chloe Jenkins (Dispatcher Lead)",
                phone="+1 (555) 018-7734",
                role=UserRole.DISPATCHER.value,
            ),
            "tech1": User(
                email="tech.alex@servisync.com",
                password_hash=get_password_hash("Tech@123"),
                full_name="Alex Rivera (HVAC & Mechanical)",
                phone="+1 (555) 012-3341",
                role=UserRole.FIELD_TECHNICIAN.value,
            ),
            "tech2": User(
                email="tech.sarah@servisync.com",
                password_hash=get_password_hash("Tech@123"),
                full_name="Sarah Chen (Master Electrician)",
                phone="+1 (555) 013-5562",
                role=UserRole.FIELD_TECHNICIAN.value,
            ),
            "cust1": User(
                email="customer.john@example.com",
                password_hash=get_password_hash("Customer@123"),
                full_name="John Reynolds",
                phone="+1 (555) 017-8821",
                role=UserRole.CUSTOMER.value,
            ),
            "cust2": User(
                email="customer.acmecorp@example.com",
                password_hash=get_password_hash("Customer@123"),
                full_name="Acme Industrial Logistics",
                phone="+1 (555) 016-4433",
                role=UserRole.CUSTOMER.value,
            ),
        }
        for u in users.values():
            db.add(u)
        db.flush()

        # 3. Create Customers
        cust1 = Customer(
            user_id=users["cust1"].id,
            name="John Reynolds",
            email=users["cust1"].email,
            phone=users["cust1"].phone,
            address="742 Evergreen Terrace, Springfield, IL 62704",
            service_location="742 Evergreen Terrace, Springfield, IL (Main Residence)",
            customer_type=CustomerType.INDIVIDUAL.value,
            status=CustomerStatus.ACTIVE.value,
        )
        cust2 = Customer(
            user_id=users["cust2"].id,
            name="Acme Industrial Logistics (Facility #4)",
            email=users["cust2"].email,
            phone=users["cust2"].phone,
            address="1200 Industrial Parkway, Dock 14, Chicago, IL 60601",
            service_location="Building B - North Mechanical Plant, Chicago, IL",
            customer_type=CustomerType.BUSINESS.value,
            status=CustomerStatus.ACTIVE.value,
        )
        db.add(cust1)
        db.add(cust2)
        db.flush()

        # 4. Create Technicians
        tech1 = Technician(
            user_id=users["tech1"].id,
            assigned_region="North Region",
            employment_status=EmploymentStatus.FULL_TIME.value,
            availability_status=TechnicianAvailabilityStatus.AVAILABLE.value,
            work_start_time="08:00",
            work_end_time="17:00",
            working_days=[1, 2, 3, 4, 5],
            service_categories=["HVAC & Climate Control", "Plumbing & Piping"],
        )
        tech2 = Technician(
            user_id=users["tech2"].id,
            assigned_region="South Metro",
            employment_status=EmploymentStatus.FULL_TIME.value,
            availability_status=TechnicianAvailabilityStatus.AVAILABLE.value,
            work_start_time="08:30",
            work_end_time="17:30",
            working_days=[1, 2, 3, 4, 5],
            service_categories=["Electrical Systems", "Industrial Machinery"],
        )
        db.add(tech1)
        db.add(tech2)
        db.flush()

        # Add Skills
        skills = [
            TechnicianSkill(technician_id=tech1.id, skill_name="HVAC Repair", proficiency_level="EXPERT"),
            TechnicianSkill(technician_id=tech1.id, skill_name="Refrigerant Handling EPA 608", proficiency_level="EXPERT"),
            TechnicianSkill(technician_id=tech1.id, skill_name="Pipe Fitting", proficiency_level="INTERMEDIATE"),
            TechnicianSkill(technician_id=tech2.id, skill_name="Commercial Electrical", proficiency_level="EXPERT"),
            TechnicianSkill(technician_id=tech2.id, skill_name="High-Voltage Switchgear", proficiency_level="INTERMEDIATE"),
            TechnicianSkill(technician_id=tech2.id, skill_name="PLC Diagnostics", proficiency_level="INTERMEDIATE"),
        ]
        for s in skills:
            db.add(s)

        # 5. Service Categories & Catalog
        cat_hvac = ServiceCategory(name="HVAC & Climate Control", description="Cooling, heating, ventilation, and thermostat systems.")
        cat_elec = ServiceCategory(name="Electrical Systems", description="Wiring, distribution panels, circuit breakers, and industrial lighting.")
        cat_pipe = ServiceCategory(name="Plumbing & Piping", description="Water line installations, leak diagnostic, and drainage maintenance.")
        cat_mach = ServiceCategory(name="Industrial Machinery", description="Motor alignments, conveyor maintenance, and vibration analysis.")
        db.add_all([cat_hvac, cat_elec, cat_pipe, cat_mach])
        db.flush()

        svc_ac_tune = Service(
            category_id=cat_hvac.id,
            name="Commercial AC Comprehensive Tune-Up",
            description="Multi-point inspection, coil cleaning, refrigerant pressure check, and motor lubrication.",
            estimated_duration=90,
            base_price=175.00,
            required_skills=["HVAC Repair"],
            required_parts=[{"part_sku": "FILT-HVAC-01", "name": "Air Filter Premium", "quantity": 1}],
            status="ACTIVE",
        )
        svc_ac_repair = Service(
            category_id=cat_hvac.id,
            name="Compressor Replacement & Refrigerant Recharge",
            description="Replacement of failed hermetic compressor and EPA certified R-410A vacuum recharge.",
            estimated_duration=180,
            base_price=420.00,
            required_skills=["HVAC Repair", "Refrigerant Handling EPA 608"],
            required_parts=[
                {"part_sku": "COMP-3T-02", "name": "AC Compressor 3-Ton", "quantity": 1},
                {"part_sku": "CAP-455-03", "name": "Dual Capacitor 45/5 uF", "quantity": 1},
            ],
            status="ACTIVE",
        )
        svc_breaker = Service(
            category_id=cat_elec.id,
            name="Main Breaker Panel Overhaul & Load Balance",
            description="Replacing tripping breakers, thermal infrared scanning, and load balancing across phases.",
            estimated_duration=120,
            base_price=260.00,
            required_skills=["Commercial Electrical"],
            required_parts=[{"part_sku": "CB-20A-04", "name": "Circuit Breaker 20A", "quantity": 2}],
            status="ACTIVE",
        )
        svc_leak = Service(
            category_id=cat_pipe.id,
            name="Emergency Pipe Leak Detection & Joint Seal",
            description="Acoustic leak pinpointing and hydraulic seal replacement for commercial supply lines.",
            estimated_duration=60,
            base_price=140.00,
            required_skills=["Pipe Fitting"],
            required_parts=[{"part_sku": "PIPE-BRASS-05", "name": "Brass Pipe Joint 3/4\"", "quantity": 1}],
            status="ACTIVE",
        )
        db.add_all([svc_ac_tune, svc_ac_repair, svc_breaker, svc_leak])
        db.flush()

        # 6. Parts Inventory
        parts = [
            Part(sku="FILT-HVAC-01", name="High-Efficiency Air Filter 20x25x4", description="MERV 13 pleated filter", available_quantity=45, unit_cost=28.50, reorder_threshold=10, status=PartStatus.IN_STOCK.value),
            Part(sku="COMP-3T-02", name="Scroll Compressor 3-Ton R410A", description="High efficiency rotary scroll unit", available_quantity=6, unit_cost=310.00, reorder_threshold=3, status=PartStatus.IN_STOCK.value),
            Part(sku="CAP-455-03", name="Motor Run Capacitor 45+5 uF 440V", description="Dual round capacitor for fan & compressor", available_quantity=22, unit_cost=16.00, reorder_threshold=5, status=PartStatus.IN_STOCK.value),
            Part(sku="CB-20A-04", name="Square-D 20-Amp Single-Pole Breaker", description="Thermal-magnetic circuit protector", available_quantity=60, unit_cost=12.50, reorder_threshold=15, status=PartStatus.IN_STOCK.value),
            Part(sku="PIPE-BRASS-05", name="3/4\" Lead-Free Brass Compression Tee", description="Heavy duty plumbing coupling", available_quantity=3, unit_cost=9.20, reorder_threshold=5, status=PartStatus.LOW_STOCK.value), # Low stock alert demo
        ]
        for p in parts:
            db.add(p)
        db.flush()

        # 7. Service Requests
        now = get_utc_now()
        sr1 = ServiceRequest(
            request_number="SR-202610-1011",
            customer_id=cust1.id,
            service_id=svc_ac_tune.id,
            service_location=cust1.service_location,
            preferred_schedule=now + timedelta(days=1, hours=2),
            priority=PriorityLevel.MEDIUM.value,
            status=ServiceRequestStatus.NEW.value,
            issue_description="AC system makes intermittent buzzing noise when cycling on and air feels mildly warm.",
        )
        sr2 = ServiceRequest(
            request_number="SR-202610-1012",
            customer_id=cust2.id,
            service_id=svc_breaker.id,
            service_location=cust2.service_location,
            preferred_schedule=now + timedelta(days=2),
            priority=PriorityLevel.HIGH.value,
            status=ServiceRequestStatus.UNDER_REVIEW.value,
            issue_description="Sub-panel 3 in cold storage area tripped twice during yesterday's night shift.",
        )
        db.add_all([sr1, sr2])
        db.flush()

        # 8. Work Orders
        # WO 1: Completed work order with report, feedback, and parts
        wo_comp_start = now - timedelta(days=2, hours=4)
        wo_comp_end = now - timedelta(days=2, hours=2)
        wo_completed = WorkOrder(
            work_order_number="WO-202610-8001",
            customer_id=cust1.id,
            service_id=svc_ac_tune.id,
            assigned_technician_id=tech1.id,
            service_location=cust1.service_location,
            description="Routine seasonal preventative maintenance and coil sanitization.",
            priority=PriorityLevel.MEDIUM.value,
            status=WorkOrderStatus.COMPLETED.value,
            scheduled_start=wo_comp_start,
            scheduled_end=wo_comp_end,
            actual_start=wo_comp_start,
            actual_end=wo_comp_end,
            estimated_cost=svc_ac_tune.base_price,
            actual_cost=203.50,
            completion_notes="Tune-up completed successfully. System operating at 98% optimal efficiency.",
        )
        db.add(wo_completed)
        db.flush()

        # Status history for completed WO
        db.add(WorkOrderStatusHistory(work_order_id=wo_completed.id, previous_status=None, new_status=WorkOrderStatus.SCHEDULED.value, changed_by_user_id=users["dispatcher"].id, notes="Job booked"))
        db.add(WorkOrderStatusHistory(work_order_id=wo_completed.id, previous_status=WorkOrderStatus.SCHEDULED.value, new_status=WorkOrderStatus.ASSIGNED.value, changed_by_user_id=users["dispatcher"].id, notes="Assigned to Alex Rivera"))
        db.add(WorkOrderStatusHistory(work_order_id=wo_completed.id, previous_status=WorkOrderStatus.ASSIGNED.value, new_status=WorkOrderStatus.IN_PROGRESS.value, changed_by_user_id=users["tech1"].id, notes="Work started on site"))
        db.add(WorkOrderStatusHistory(work_order_id=wo_completed.id, previous_status=WorkOrderStatus.IN_PROGRESS.value, new_status=WorkOrderStatus.COMPLETED.value, changed_by_user_id=users["tech1"].id, notes="Job finalized"))

        # Parts consumed for completed WO
        filter_part = parts[0]
        db.add(WorkOrderPart(
            work_order_id=wo_completed.id,
            part_id=filter_part.id,
            quantity=1,
            unit_price=filter_part.unit_cost,
            status="CONSUMED",
        ))

        # Service Report
        report = ServiceReport(
            work_order_id=wo_completed.id,
            technician_id=tech1.id,
            work_summary="Completed comprehensive 18-point AC checkup. Flushed condensate trap, cleansed evaporator coils with non-acidic foam, replaced saturated primary air filter, and verified static duct pressures.",
            diagnosis="Slight dust buildup on blower fan assembly and filter airflow resistance.",
            actions_performed="Replaced filter, calibrated smart thermostat offset by -1.5 degrees, washed condenser fan fins, lubricated bearing ports.",
            start_time=wo_comp_start,
            completion_time=wo_comp_end,
            customer_remarks="Technician was very professional and on time. Highly recommended!",
            recommendations="Recommend duct sanitization before the upcoming summer season.",
            parts_used=[{"sku": filter_part.sku, "name": filter_part.name, "quantity": 1, "unit_price": float(filter_part.unit_cost)}],
        )
        db.add(report)

        # Feedback
        db.add(Feedback(
            work_order_id=wo_completed.id,
            customer_id=cust1.id,
            rating=5,
            timeliness_rating=5,
            quality_rating=5,
            professionalism_rating=5,
            comments="Alex did a great job explaining everything clearly. AC runs silent now.",
        ))

        # WO 2: In-Progress Job
        wo_inprog_start = now - timedelta(minutes=45)
        wo_inprog_end = now + timedelta(minutes=75)
        wo_inprog = WorkOrder(
            work_order_number="WO-202610-8002",
            customer_id=cust2.id,
            service_id=svc_ac_repair.id,
            assigned_technician_id=tech1.id,
            service_location=cust2.service_location,
            description="Compressor failure diagnostic and replacement on rooftop unit #2.",
            priority=PriorityLevel.URGENT.value,
            status=WorkOrderStatus.IN_PROGRESS.value,
            scheduled_start=wo_inprog_start,
            scheduled_end=wo_inprog_end,
            actual_start=wo_inprog_start,
            estimated_cost=svc_ac_repair.base_price,
        )
        db.add(wo_inprog)
        db.flush()
        db.add(WorkOrderStatusHistory(work_order_id=wo_inprog.id, previous_status=None, new_status=WorkOrderStatus.ASSIGNED.value, changed_by_user_id=users["dispatcher"].id, notes="Assigned urgent job"))
        db.add(WorkOrderStatusHistory(work_order_id=wo_inprog.id, previous_status=WorkOrderStatus.ASSIGNED.value, new_status=WorkOrderStatus.IN_PROGRESS.value, changed_by_user_id=users["tech1"].id, notes="Commenced disassembly"))

        # WO 3: Scheduled / Assigned Job for tomorrow
        wo_sched_start = now + timedelta(days=1, hours=1)
        wo_sched_end = now + timedelta(days=1, hours=3)
        wo_sched = WorkOrder(
            work_order_number="WO-202610-8003",
            customer_id=cust2.id,
            service_id=svc_breaker.id,
            assigned_technician_id=tech2.id,
            service_location=cust2.service_location,
            description="Breaker panel inspection & 3-phase load balance.",
            priority=PriorityLevel.HIGH.value,
            status=WorkOrderStatus.ASSIGNED.value,
            scheduled_start=wo_sched_start,
            scheduled_end=wo_sched_end,
            estimated_cost=svc_breaker.base_price,
        )
        db.add(wo_sched)
        db.flush()

        # Assignment history
        db.add(WorkOrderAssignment(
            work_order_id=wo_sched.id,
            technician_id=tech2.id,
            assigned_by_user_id=users["dispatcher"].id,
            scheduled_start=wo_sched_start,
            scheduled_end=wo_sched_end,
        ))

        # WO 4: Unassigned Draft Work Order (for dispatcher board demo)
        wo_draft = WorkOrder(
            work_order_number="WO-202610-8004",
            customer_id=cust1.id,
            service_id=svc_leak.id,
            service_location=cust1.service_location,
            description="Basement main valve drip inspection.",
            priority=PriorityLevel.MEDIUM.value,
            status=WorkOrderStatus.DRAFT.value,
            estimated_cost=svc_leak.base_price,
        )
        db.add(wo_draft)

        # 9. Initial Notifications
        notifications = [
            Notification(user_id=users["admin"].id, title="Low Stock Alert", message="Brass Pipe Joint 3/4\" has reached low stock: 3 remaining.", type=NotificationType.LOW_STOCK_DETECTED.value, link_url="/parts"),
            Notification(user_id=users["dispatcher"].id, title="New Service Request", message="Request SR-202610-1011 submitted by John Reynolds.", type=NotificationType.SERVICE_REQUEST_RECEIVED.value, link_url="/service-requests"),
            Notification(user_id=users["tech1"].id, title="Job Started", message="Work order WO-202610-8002 is marked In Progress.", type=NotificationType.WORK_STARTED.value, link_url=f"/work-orders/{wo_inprog.id}"),
            Notification(user_id=users["cust1"].id, title="Work Order Completed", message="Work order WO-202610-8001 is complete. View your report & invoice.", type=NotificationType.WORK_COMPLETED.value, link_url=f"/work-orders/{wo_completed.id}"),
        ]
        for n in notifications:
            db.add(n)

        db.commit()
        print("Database successfully seeded with realistic operational data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

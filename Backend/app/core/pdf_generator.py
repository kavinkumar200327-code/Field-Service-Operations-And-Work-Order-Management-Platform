import io
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_service_report_pdf(report, work_order, technician, customer, parts_consumed=None) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0f172a'),
        alignment=0,
    )
    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#64748b'),
    )
    heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#1e40af'),
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#1e293b'),
    )
    bold_label = ParagraphStyle(
        'BoldLabel',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        fontName='Helvetica-Bold',
        textColor=colors.HexColor('#334155'),
    )

    story = []

    # Header Banner
    header_data = [
        [
            Paragraph("<b>SERVYSYNC PRO</b><br/><font size=8 color='#64748b'>Field Service Operations & Work Order Platform</font>", body_style),
            Paragraph("<b>FIELD SERVICE REPORT</b><br/><font size=8 color='#64748b'>Work Order #: " + str(work_order.work_order_number) + "</font>", title_style)
        ]
    ]
    header_table = Table(header_data, colWidths=[250, 290])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#0284c7'), spaceAfter=15))

    # Meta Information Grid
    created_str = report.created_at.strftime('%Y-%m-%d %H:%M UTC') if report.created_at else datetime.now().strftime('%Y-%m-%d')
    start_str = report.start_time.strftime('%Y-%m-%d %H:%M') if report.start_time else "N/A"
    end_str = report.completion_time.strftime('%Y-%m-%d %H:%M') if report.completion_time else "N/A"

    tech_name = technician.user.full_name if technician and technician.user else "Assigned Technician"
    cust_name = customer.name if customer else "Client"
    cust_phone = customer.phone if customer else "N/A"
    cust_loc = work_order.service_location or (customer.service_location if customer else "N/A")

    info_data = [
        [Paragraph("<b>Customer Name:</b>", bold_label), Paragraph(cust_name, body_style),
         Paragraph("<b>Technician:</b>", bold_label), Paragraph(tech_name, body_style)],
        [Paragraph("<b>Phone:</b>", bold_label), Paragraph(cust_phone, body_style),
         Paragraph("<b>Region:</b>", bold_label), Paragraph(technician.assigned_region if technician else "Metro", body_style)],
        [Paragraph("<b>Service Location:</b>", bold_label), Paragraph(cust_loc, body_style),
         Paragraph("<b>Job Duration:</b>", bold_label), Paragraph(f"{start_str} to {end_str}", body_style)],
        [Paragraph("<b>Status:</b>", bold_label), Paragraph(f"<font color='#16a34a'><b>{work_order.status}</b></font>", body_style),
         Paragraph("<b>Report Date:</b>", bold_label), Paragraph(created_str, body_style)],
    ]
    info_table = Table(info_data, colWidths=[90, 180, 80, 190])
    info_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))

    # Diagnosis & Summary
    story.append(Paragraph("1. Diagnosis & Issue Description", heading_style))
    story.append(Paragraph(f"<b>Reported Issue:</b> {work_order.description or 'N/A'}", body_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"<b>Technician Diagnosis:</b> {report.diagnosis or 'Diagnosis verified on site.'}", body_style))
    story.append(Spacer(1, 12))

    # Actions Performed
    story.append(Paragraph("2. Actions Performed & Work Summary", heading_style))
    story.append(Paragraph(report.actions_performed or "Standard maintenance and repair operations executed.", body_style))
    story.append(Spacer(1, 4))
    story.append(Paragraph(f"<b>Summary Notes:</b> {report.work_summary or 'Completed successfully according to technical safety guidelines.'}", body_style))
    story.append(Spacer(1, 12))

    # Parts and Materials Consumed Table
    story.append(Paragraph("3. Parts & Materials Used", heading_style))
    parts_rows = [
        [
            Paragraph("<b>Item / SKU</b>", bold_label),
            Paragraph("<b>Quantity</b>", bold_label),
            Paragraph("<b>Unit Price</b>", bold_label),
            Paragraph("<b>Total Amount</b>", bold_label)
        ]
    ]

    total_parts_cost = 0.0
    if parts_consumed and len(parts_consumed) > 0:
        for p in parts_consumed:
            p_name = p.part.name if p.part else (p.part_sku or "Replacement Part")
            p_qty = p.quantity or 1
            p_price = float(p.unit_price or 0.0)
            p_total = p_qty * p_price
            total_parts_cost += p_total
            parts_rows.append([
                Paragraph(f"{p_name} <font color='#64748b' size=7>({p.part.sku if p.part else 'N/A'})</font>", body_style),
                Paragraph(str(p_qty), body_style),
                Paragraph(f"${p_price:.2f}", body_style),
                Paragraph(f"${p_total:.2f}", body_style),
            ])
    else:
        parts_rows.append([Paragraph("No billable parts consumed for this work order.", body_style), "-", "-", "$0.00"])

    # Cost summary row
    base_service_cost = float(work_order.estimated_cost or 0.0)
    actual_total_cost = float(work_order.actual_cost) if work_order.actual_cost is not None else (base_service_cost + total_parts_cost)
    parts_rows.append([
        Paragraph("<b>Total Actual Service Charge:</b>", bold_label),
        "",
        "",
        Paragraph(f"<b>${actual_total_cost:.2f}</b>", bold_label)
    ])

    parts_table = Table(parts_rows, colWidths=[240, 80, 100, 120])
    parts_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f1f5f9')),
        ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1')),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
        ('SPAN', (0, -1), (2, -1)),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f8fafc')),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(parts_table)
    story.append(Spacer(1, 15))

    # Recommendations & Customer Remarks
    if report.recommendations or report.customer_remarks:
        story.append(Paragraph("4. Recommendations & Customer Feedback", heading_style))
        if report.recommendations:
            story.append(Paragraph(f"<b>Technician Recommendations:</b> {report.recommendations}", body_style))
            story.append(Spacer(1, 4))
        if report.customer_remarks:
            story.append(Paragraph(f"<b>Customer Remarks:</b> {report.customer_remarks}", body_style))
        story.append(Spacer(1, 15))

    # Signatures
    story.append(Spacer(1, 20))
    sig_data = [
        [
            Paragraph("____________________________<br/><b>Technician Signature:</b> " + tech_name + "<br/><font size=7 color='#64748b'>Certified Field Specialist</font>", body_style),
            Paragraph("____________________________<br/><b>Customer Sign-off:</b> " + cust_name + "<br/><font size=7 color='#64748b'>Acknowledged Satisfactory Service</font>", body_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
    ]))
    story.append(sig_table)

    doc.build(story)
    buffer.seek(0)
    return buffer

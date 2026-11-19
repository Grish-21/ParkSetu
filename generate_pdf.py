import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

PDF_PATH = "d:/IdeaLab5/ParkSetu_Tutorial_and_Run_Guide.pdf"

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "ParkSetu — Smart IoT Parking Platform Tutorial & Run Guide")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)

        # Footer
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 45, 558, 45)
        self.drawString(54, 32, "Confidential — Demo MVP Documentation | Mira Bhayandar, MH, India")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 32, page_str)
        self.restoreState()

def build_pdf():
    doc = SimpleDocTemplate(
        PDF_PATH,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=colors.HexColor("#1e1b4b"),
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#4f46e5"),
        spaceAfter=14,
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#334155"),
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b"),
        spaceAfter=6,
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#0f172a"),
        spaceBefore=2,
        spaceAfter=2,
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    )

    story = []

    # Cover Title
    story.append(Paragraph("ParkSetu — Smart IoT Parking Platform", title_style))
    story.append(Paragraph("End-to-End System Tutorial, Architecture & Run Guide", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#4f46e5"), spaceAfter=12))

    # Intro Callout
    intro_p = Paragraph(
        "<b>Project Summary:</b> ParkSetu is a real-time, AI and IoT-assisted smart parking web application (PWA) "
        "designed for high-density municipal parking in <b>Mira Bhayandar, Maharashtra, India</b>. "
        "Drivers discover private parking lots (malls, petrol pumps, station plazas), book slots in advance, "
        "pass through automated QR check-in gates, and receive automated reroute suggestions when slots risk overstay. "
        "This guide explains how to start, connect, test, and present the system demo.",
        callout_style
    )
    callout_table = Table([[intro_p]], colWidths=[504])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
    ]))
    story.append(callout_table)
    story.append(Spacer(1, 10))

    # Architecture Overview Table
    story.append(Paragraph("1. System Architecture Overview", h1_style))
    story.append(Paragraph(
        "The project consists of three independent modules developed in parallel, communicating over standardized REST and WebSocket contracts:",
        body_style
    ))

    arch_data = [
        [
            Paragraph("<b>Module</b>", body_style),
            Paragraph("<b>Tech Stack</b>", body_style),
            Paragraph("<b>Port / Path</b>", body_style),
            Paragraph("<b>Key Responsibilities</b>", body_style)
        ],
        [
            Paragraph("<b>Backend</b>", body_style),
            Paragraph("FastAPI, SQLite, SQLAlchemy, APScheduler, JWT", body_style),
            Paragraph("<code>http://localhost:8000</code>", code_style),
            Paragraph("Database persistence, slot allocation, QR tokens, pricing, WebSockets (/ws/lots and /ws/me)", body_style)
        ],
        [
            Paragraph("<b>Frontend</b>", body_style),
            Paragraph("React 18, Vite, TypeScript, Tailwind, Leaflet, PWA", body_style),
            Paragraph("<code>http://localhost:5173</code>", code_style),
            Paragraph("Mobile-first PWA, interactive map, live slot grid, QR ticket generation, countdowns, owner & admin portals", body_style)
        ],
        [
            Paragraph("<b>ML / Vision</b>", body_style),
            Paragraph("YOLOv8, LightGBM, OpenCV, scikit-learn", body_style),
            Paragraph("<code>ml/vision/simulator.py</code><br/><code>ml/forecast/forecast.py</code>", code_style),
            Paragraph("Camera telemetry simulator, live slot occupancy polling, LightGBM dwell-time availability forecasting", body_style)
        ]
    ]
    t_arch = Table(arch_data, colWidths=[70, 110, 120, 204])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 12))

    # Step-by-Step Run Instructions
    story.append(Paragraph("2. How to Run the Complete System", h1_style))
    story.append(Paragraph(
        "To run the live integrated demo with the backend, frontend, and camera telemetry simulator active simultaneously, "
        "open <b>three terminals</b> from the repository root (<code>d:\\IdeaLab5</code>):",
        body_style
    ))

    # Terminal 1 Box
    story.append(Paragraph("<b>Terminal 1: Backend API Server</b>", h2_style))
    t1_text = (
        "<code># 1. Set PYTHONPATH to include root and backend<br/>"
        "$env:PYTHONPATH=\".;backend\"<br/><br/>"
        "# 2. Seed SQLite database with demo lots & users (done once)<br/>"
        "cd backend ; python seed.py ; cd ..<br/><br/>"
        "# 3. Start FastAPI server with Uvicorn<br/>"
        "uvicorn app.main:app --reload --port 8000 --app-dir backend</code>"
    )
    t1_box = Table([[Paragraph(t1_text, code_style)]], colWidths=[504])
    t1_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t1_box)
    story.append(Spacer(1, 8))

    # Terminal 2 Box
    story.append(Paragraph("<b>Terminal 2: Frontend Web Client (PWA)</b>", h2_style))
    t2_text = (
        "<code># 1. In frontend/.env ensure: VITE_USE_MOCK=false and VITE_API_URL=http://localhost:8000<br/>"
        "cd frontend<br/>"
        "npm install<br/>"
        "npm run dev</code>"
    )
    t2_box = Table([[Paragraph(t2_text, code_style)]], colWidths=[504])
    t2_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t2_box)
    story.append(Spacer(1, 8))

    # Terminal 3 Box
    story.append(Paragraph("<b>Terminal 3: ML Vision Simulator (Camera Telemetry)</b>", h2_style))
    t3_text = (
        "<code># Start the simulator posting real slot updates for Lot 1 (Mira Road Station Plaza)<br/>"
        "cd ml<br/>"
        "python -m vision.simulator --lot-id 1 --slots 1,2,3,4,5,6,7,8,9 --url http://localhost:8000 --interval 3</code>"
    )
    t3_box = Table([[Paragraph(t3_text, code_style)]], colWidths=[504])
    t3_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t3_box)

    story.append(PageBreak())

    # Standalone Mock Mode Section
    story.append(Paragraph("3. Standalone Offline Mock Mode (Zero-Dependency Demo)", h1_style))
    story.append(Paragraph(
        "If you want to demo the frontend without starting Python, databases, or terminal servers, "
        "the frontend includes a full built-in mock database and timer simulator:",
        body_style
    ))
    mock_text = (
        "<code># 1. Edit frontend/.env:<br/>"
        "VITE_USE_MOCK=true<br/>"
        "VITE_API_URL=http://localhost:8000<br/><br/>"
        "# 2. Launch Vite:<br/>"
        "cd frontend ; npm run dev</code>"
    )
    mock_box = Table([[Paragraph(mock_text, code_style)]], colWidths=[504])
    mock_box.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#3b82f6")),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(mock_box)
    story.append(Spacer(1, 10))

    # Pre-seeded Accounts
    story.append(Paragraph("4. Demo Accounts & Pre-Configured Credentials", h1_style))
    story.append(Paragraph(
        "The login page features <b>1-Click Demo Login</b> buttons for instant access without manual typing:",
        body_style
    ))

    users_data = [
        [
            Paragraph("<b>Role</b>", body_style),
            Paragraph("<b>Email</b>", body_style),
            Paragraph("<b>Password</b>", body_style),
            Paragraph("<b>Default View & Permissions</b>", body_style)
        ],
        [
            Paragraph("<b>Driver</b>", body_style),
            Paragraph("<code>driver@demo.com</code>", code_style),
            Paragraph("<code>demo1234</code>", code_style),
            Paragraph("Driver portal: Nearby map, slot reservation, active bookings, QR passes", body_style)
        ],
        [
            Paragraph("<b>Lot Owner</b>", body_style),
            Paragraph("<code>owner@demo.com</code>", code_style),
            Paragraph("<code>demo1234</code>", code_style),
            Paragraph("Owner portal: Register lots, click-to-pin GPS coordinates, configure buffer slots", body_style)
        ],
        [
            Paragraph("<b>Admin</b>", body_style),
            Paragraph("<code>admin@demo.com</code>", code_style),
            Paragraph("<code>demo1234</code>", code_style),
            Paragraph("City analytics: 24h occupancy curves, peak traffic bins, no-show and overstay rates", body_style)
        ]
    ]
    t_users = Table(users_data, colWidths=[70, 120, 80, 234])
    t_users.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_users)
    story.append(Spacer(1, 12))

    # Demo Walkthrough Guide
    story.append(Paragraph("5. Interactive Demo Walkthrough (Step-by-Step)", h1_style))
    
    walkthrough_items = [
        ("Step 1: Explore Nearby Lots", 
         "Open <code>http://localhost:5173</code>. The interactive Leaflet map will center on Mira Road (19.2813, 72.8689). "
         "You will see 3 seeded parking lots: Mira Road Station Plaza, Mira-Bhayandar Mall, and Bhayandar Petrol Pump. "
         "Cards indicate real-time distance, price per hour, and dynamic color-coded availability badges (Green: ample space, Amber: low, Red: full)."),

        ("Step 2: Live CCTV Slot Grid", 
         "Click <b>View Slots</b> on Lot 1. You will see 10 slots (A01–A09, plus BUF-1 buffer). "
         "With Terminal 3 (Simulator) running, slots will flip between green (free) and red (occupied) live over WebSockets. "
         "Above the grid, the <b>AI Availability Forecast</b> will display estimated turnover time and confidence."),

        ("Step 3: Reserve a Slot & Generate QR Pass", 
         "Click <b>Book Spot</b>, enter a vehicle number (e.g. <code>MH04AB1234</code>), choose a time window, and confirm. "
         "The app instantly provisions the lowest available slot label and renders a high-resolution <b>QR Gate Pass</b>."),

        ("Step 4: Simulate Gate Barrier Entry", 
         "Navigate to <code>/gate</code> (or click 'Simulate Gate Check-In'). Paste or select your QR token and click "
         "<b>Simulate Gate Scan</b>. The barrier lifts, and the booking flips to <code>CHECKED_IN</code>."),

        ("Step 5: Booking Management & Overstay Safety", 
         "Under <code>/bookings</code>, monitor live second-by-second countdowns. Drivers can click <b>Extend (+30m)</b> "
         "to extend their parking, or click <b>Exit Gate</b> to complete the parking session."),

        ("Step 6: Owner Dashboard", 
         "Log in as <code>owner@demo.com</code> and navigate to <code>/owner</code>. You can register new parking lots by clicking "
         "on the interactive map to pin GPS coordinates, and toggle which slots are reserved as non-bookable buffer safety slots."),

        ("Step 7: City Admin Analytics", 
         "Log in as <code>admin@demo.com</code> and open <code>/admin</code>. Interactive Recharts visualizes 24-hour occupancy percentages, "
         "peak traffic windows requiring driver reroutes, revenue generated, and no-show rates.")
    ]

    for title, desc in walkthrough_items:
        story.append(Paragraph(f"<b>{title}</b>", h2_style))
        story.append(Paragraph(desc, body_style))
        story.append(Spacer(1, 2))

    story.append(PageBreak())

    # Automated Testing & Verification
    story.append(Paragraph("6. Automated Verification Test Suite", h1_style))
    story.append(Paragraph(
        "A complete end-to-end integration test is provided in <code>test_e2e_integration.py</code>. "
        "With the backend running on port 8000, execute the following command to test all 9 contract join points automatically:",
        body_style
    ))
    test_cmd = "<code>python test_e2e_integration.py</code>"
    story.append(Table([[Paragraph(test_cmd, code_style)]], colWidths=[504], style=[
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#94a3b8")),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(Spacer(1, 8))

    test_checklist = [
        "Swagger Docs Verification (/docs returns 200 OK)",
        "Driver Authentication (driver@demo.com token generation)",
        "Nearby Lots Distance Query (returns 3 seed lots)",
        "Lot 1 Slot Enumeration & Real-Time Status Checks",
        "LightGBM Availability Forecast Validation",
        "Slot Booking & QR Pass Provisioning",
        "Gate QR Token Scanning & CHECKED_IN State Machine Transition",
        "Window Extension (+1 Hour) Verification",
        "HTTP 409 Conflict Simulation (Lot Full -> Structured Alternatives)",
        "Municipal Admin Analytics Aggregation"
    ]
    for chk in test_checklist:
        story.append(Paragraph(f"✓ &nbsp; {chk}", body_style))

    story.append(Spacer(1, 12))

    # Common Issues & Troubleshooting
    story.append(Paragraph("7. Troubleshooting & Common Pitfalls", h1_style))
    trouble_data = [
        [
            Paragraph("<b>Issue / Symptom</b>", body_style),
            Paragraph("<b>Root Cause</b>", body_style),
            Paragraph("<b>Solution</b>", body_style)
        ],
        [
            Paragraph("<b>Simulator posts fail (422)</b>", body_style),
            Paragraph("Simulator posting slot IDs that do not exist in SQLite.", body_style),
            Paragraph("Query real IDs via <code>curl http://localhost:8000/lots/1/slots</code>. For Lot 1, use <code>--slots 1,2,3,4,5,6,7,8,9</code>.", body_style)
        ],
        [
            Paragraph("<b>ModuleNotFoundError: 'ml'</b>", body_style),
            Paragraph("Backend launched without root directory in Python path.", body_style),
            Paragraph("Set <code>$env:PYTHONPATH=\".;backend\"</code> in PowerShell before starting Uvicorn.", body_style)
        ],
        [
            Paragraph("<b>CORS Error in Browser</b>", body_style),
            Paragraph("Backend missing origin header for port 5173.", body_style),
            Paragraph("Backend <code>main.py</code> is preconfigured with CORS allowing <code>http://localhost:5173</code>.", body_style)
        ],
        [
            Paragraph("<b>Time displayed 5.5 hours off</b>", body_style),
            Paragraph("Timezone mismatch between UTC and IST.", body_style),
            Paragraph("All payloads use UTC ISO strings ending in <code>Z</code>. Frontend converts to <code>Asia/Kolkata</code> automatically.", body_style)
        ]
    ]
    t_trouble = Table(trouble_data, colWidths=[120, 150, 234])
    t_trouble.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(t_trouble)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully built at {PDF_PATH}")

if __name__ == "__main__":
    build_pdf()

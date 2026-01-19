from flask import Flask, render_template, request, jsonify, send_file
import qrcode
from io import BytesIO
import base64
from PIL import Image, ImageDraw, ImageFont

app = Flask(__name__)

@app.route('/qr-gen', methods=['GET'])
def index():
    """Render the QR code generator page"""
    return render_template('index.html')

@app.route('/qr-gen/generate', methods=['POST'])
def generate_qr():
    """Generate QR code label for XP-470B thermal printer at 203 DPI"""
    try:
        data = request.get_json()
        admission_number = data.get('admission_number', '').strip()

        if not admission_number:
            return jsonify({'error': 'Admission number is required'}), 400

        # XP-470B thermal printer settings at 203 DPI
        dpi = 203

        # Get label size (default to 60x40mm)
        label_size = data.get('label_size', '60x40')

        # Supported label sizes
        label_sizes = {
            '60x40': (60, 40),
            '40x30': (40, 30)
        }

        if label_size not in label_sizes:
            return jsonify({'error': f'Invalid label size. Supported: {", ".join(label_sizes.keys())}'}), 400

        width_mm, height_mm = label_sizes[label_size]

        # Calculate pixel dimensions
        # 1 inch = 25.4mm
        width_pixels = int((width_mm / 25.4) * dpi)   # ~480px
        height_pixels = int((height_mm / 25.4) * dpi)  # ~320px
        print(f"Label size: {width_mm}x{height_mm}mm = {width_pixels}x{height_pixels}px at {dpi} DPI")

        # Generate QR code with minimal border
        qr = qrcode.QRCode(
            version=None,  # Auto-determine version based on data
            error_correction=qrcode.constants.ERROR_CORRECT_M,  # Medium error correction
            box_size=1,  # Will be scaled later
            border=0,  # No border
        )
        qr.add_data(admission_number)
        qr.make(fit=True)

        # Create QR image
        qr_img = qr.make_image(fill_color="black", back_color="white")

        # Helper function to get font
        def get_font(size):
            try:
                return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
            except:
                try:
                    return ImageFont.truetype("/usr/share/fonts/TTF/DejaVuSans-Bold.ttf", size)
                except:
                    try:
                        return ImageFont.truetype("arial.ttf", size)
                    except:
                        return ImageFont.load_default()

        # Create the full label image (white background)
        label_img = Image.new('RGB', (width_pixels, height_pixels), 'white')
        draw = ImageDraw.Draw(label_img)
        label_text = f"WCN26F-{admission_number}"

        # Layout based on specific label size
        if label_size == '60x40':
            # 60x40mm: QR on left, text on right (side by side)
            qr_size = height_pixels - 4  # QR fills height
            qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.NEAREST)

            # Position QR at left
            qr_x = 2
            qr_y = (height_pixels - qr_size) // 2
            label_img.paste(qr_img, (qr_x, qr_y))

            # Text on right side
            text_area_width = width_pixels - qr_size - 8

            # Find max font that fits in text area
            font_size = 50
            font = get_font(font_size)
            text_bbox = draw.textbbox((0, 0), label_text, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height_actual = text_bbox[3] - text_bbox[1]

            while text_width > text_area_width and font_size > 12:
                font_size -= 1
                font = get_font(font_size)
                text_bbox = draw.textbbox((0, 0), label_text, font=font)
                text_width = text_bbox[2] - text_bbox[0]
                text_height_actual = text_bbox[3] - text_bbox[1]

            # Center text in right area
            text_x = qr_size + 4 + (text_area_width - text_width) // 2
            text_y = (height_pixels - text_height_actual) // 2

            draw.text((text_x, text_y), label_text, fill='black', font=font)
            print(f"60x40 layout: QR {qr_size}px, font {font_size}px")

        else:  # 40x30mm: QR on top, text below
            # Calculate text height first to reserve space
            font_size = 28
            font = get_font(font_size)
            text_bbox = draw.textbbox((0, 0), label_text, font=font)
            text_width = text_bbox[2] - text_bbox[0]
            text_height_actual = text_bbox[3] - text_bbox[1]

            # Scale font to fit width
            while text_width > width_pixels - 4 and font_size > 12:
                font_size -= 1
                font = get_font(font_size)
                text_bbox = draw.textbbox((0, 0), label_text, font=font)
                text_width = text_bbox[2] - text_bbox[0]
                text_height_actual = text_bbox[3] - text_bbox[1]

            # QR takes remaining height (fill width)
            qr_size = min(width_pixels, height_pixels - text_height_actual - 4)
            qr_img = qr_img.resize((qr_size, qr_size), Image.Resampling.NEAREST)

            # Center QR horizontally at top
            qr_x = (width_pixels - qr_size) // 2
            qr_y = 0
            label_img.paste(qr_img, (qr_x, qr_y))

            # Text at bottom, centered
            text_x = (width_pixels - text_width) // 2
            text_y = qr_size + 2

            draw.text((text_x, text_y), label_text, fill='black', font=font)
            print(f"40x30 layout: QR {qr_size}px, font {font_size}px")

        # Convert to base64 for embedding in HTML
        buffer = BytesIO()
        label_img.save(buffer, format='PNG', dpi=(dpi, dpi))
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()

        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_base64}',
            'admission_number': admission_number,
            'label_text': label_text,
            'width_mm': width_mm,
            'height_mm': height_mm,
            'width_pixels': width_pixels,
            'height_pixels': height_pixels,
            'dpi': dpi
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/qr-gen/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3002, debug=False)

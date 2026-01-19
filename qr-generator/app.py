from flask import Flask, render_template, request, jsonify, send_file
import qrcode
from io import BytesIO
import base64
from PIL import Image

app = Flask(__name__)

@app.route('/qr-gen', methods=['GET'])
def index():
    """Render the QR code generator page"""
    return render_template('index.html')

@app.route('/qr-gen/generate', methods=['POST'])
def generate_qr():
    """Generate QR code from admission number"""
    try:
        data = request.get_json()
        admission_number = data.get('admission_number', '').strip()

        if not admission_number:
            return jsonify({'error': 'Admission number is required'}), 400

        size_mm = int(data.get('size', 30))
        print(f"Requested size: {size_mm}mm")

        # Calculate pixel size (assuming 300 DPI for print quality)
        # 1 inch = 25.4mm, 1 inch = 300 pixels at 300 DPI
        dpi = 300
        size_pixels = int((size_mm / 25.4) * dpi)
        print(f"Calculated pixel size: {size_pixels}px")

        # Generate QR code with minimal border
        qr = qrcode.QRCode(
            version=None,  # Auto-determine version based on data
            error_correction=qrcode.constants.ERROR_CORRECT_M,  # Medium error correction
            box_size=1,  # Will be scaled later
            border=0,  # No border - we'll add minimal padding manually
        )
        qr.add_data(admission_number)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Get the actual QR code size
        qr_width, qr_height = img.size
        print(f"Original QR size: {qr_width}x{qr_height}px")

        # Resize QR code to exact pixel size (no padding)
        img = img.resize((size_pixels, size_pixels), Image.Resampling.NEAREST)
        print(f"Resized QR to: {size_pixels}x{size_pixels}px")

        # Convert to base64 for embedding in HTML
        buffer = BytesIO()
        img.save(buffer, format='PNG', dpi=(dpi, dpi))
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()

        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_base64}',
            'admission_number': admission_number,
            'size_mm': size_mm,
            'size_pixels': size_pixels
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/qr-gen/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3002, debug=False)

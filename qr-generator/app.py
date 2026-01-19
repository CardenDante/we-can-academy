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

        # Calculate pixel size (assuming 300 DPI for print quality)
        # 1 inch = 25.4mm, 1 inch = 300 pixels at 300 DPI
        dpi = 300
        size_pixels = int((size_mm / 25.4) * dpi)

        # Generate QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=1,
        )
        qr.add_data(admission_number)
        qr.make(fit=True)

        # Create image
        img = qr.make_image(fill_color="black", back_color="white")

        # Resize to exact dimensions
        img = img.resize((size_pixels, size_pixels), Image.Resampling.LANCZOS)

        # Convert to base64 for embedding in HTML
        buffer = BytesIO()
        img.save(buffer, format='PNG', dpi=(dpi, dpi))
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.getvalue()).decode()

        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_base64}',
            'admission_number': admission_number,
            'size_mm': size_mm
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/qr-gen/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3002, debug=False)

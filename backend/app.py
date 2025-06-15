from flask import Flask, send_file, request
import requests, io
from flask_cors import CORS
from PyPDF2 import PdfReader, PdfWriter


app = Flask(__name__)
CORS(app)

@app.route("/")
def index():
    return "PDF Unlocker API is running!"

@app.route("/unlock", methods=["POST"])
def unlock():
    data = request.get_json()
    pdf_url = data.get("url")
    password = data.get("password")
    # print(f"Received URL: {pdf_url}, Password: {password}")

    pdf_res = requests.get(pdf_url)
    if pdf_res.status_code != 200:
        return "Failed to download PDF", 400

    input_pdf = PdfReader(io.BytesIO(pdf_res.content))
    if input_pdf.is_encrypted:
        try:
            input_pdf.decrypt(password)
        except Exception as e:
            return f"Failed to decrypt PDF: {e}", 500

    output = PdfWriter()
    for page in input_pdf.pages:
        output.add_page(page)

    output_stream = io.BytesIO()
    output.write(output_stream)
    output_stream.seek(0)

    return send_file(output_stream, as_attachment=True,
                        download_name="file.pdf",
                        mimetype='application/pdf')

if __name__ == "__main__":
    app.run(debug=True)
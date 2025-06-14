from flask import Flask, render_template, request, send_file
import re
import requests, io
from PyPDF2 import PdfReader, PdfWriter
from binascii import unhexlify
import base64
from Crypto.Cipher import AES

app = Flask(__name__)


def find_pdf_password(a: str, decode_utf8=True) -> str:
    iv_hex = a[:32]
    ciphertext_b64 = a[32:-32]
    key_hex = a[-32:]

    iv = unhexlify(iv_hex)
    key = unhexlify(key_hex)
    ciphertext = base64.b64decode(ciphertext_b64)

    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(ciphertext)

    pad_len = decrypted[-1]
    decrypted = decrypted[:-pad_len]

    return decrypted.decode('utf-8') if decode_utf8 else decrypted


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == 'POST':
        course_url = request.form['course_url'].strip('/')
        pdf_id = request.form['pdf_id']
        cookie = request.form['cookie']

        BASE_URL = "https://ilearn.gehu.ac.in/s"

        # Extract course ID using regex
        match = re.search(r"courses/([a-f0-9]{24})", course_url)
        if match:
            course_id = match.group(1)
            # print("Extracted Course ID:", course_id)
        else:
            course_id = None
            print("Invalid course URL format.")

        preview_url = f"{BASE_URL}/courses/{course_id}/pdfs/{pdf_id}/preview/url"
        # print("Preview URL:", preview_url)

        headers = {
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://ilearn.gehu.ac.in/",
            "Cookie": cookie
        }

        preview_res = requests.get(preview_url, headers=headers)
        if preview_res.status_code != 200:
            return "Failed to fetch preview URL", 400

        try:
            data = preview_res.json()
            pdf_url = data.get("url")
            p_string = data.get("p")

            # print("PDF URL:", pdf_url)
            # print("Password:", p_string)
        except Exception as e:
            return f"Invalid JSON or missing fields: {e}", 500
        
        password = find_pdf_password(p_string)
        # print("Decrypted Password:", password)

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
    
    return render_template("index.html")


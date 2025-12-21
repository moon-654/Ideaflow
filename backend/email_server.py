from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import logging

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "Email Server is running"}), 200

@app.route('/send-email', methods=['POST'])
def send_email():
    try:
        data = request.json
        config = data.get('config')
        message = data.get('message')

        if not config or not message:
            return jsonify({"error": "Missing config or message"}), 400

        # SMTP Configuration
        smtp_server = config.get('smtpServer')
        smtp_port = int(config.get('smtpPort', 587))
        smtp_user = config.get('smtpUsername')
        smtp_pass = config.get('smtpPassword')
        use_tls = config.get('enableStartTls', True)
        use_ssl = config.get('enableSsl', False)
        
        # Message Construction
        msg = MIMEMultipart()
        msg['From'] = smtp_user # Or explicit 'from' field if provided
        msg['To'] = message.get('to')
        msg['Subject'] = message.get('subject')
        
        body = message.get('body')
        msg.attach(MIMEText(body, 'plain' if '<html' not in body else 'html'))

        # Sending Logic
        if use_ssl:
            server = smtplib.SMTP_SSL(smtp_server, smtp_port)
        else:
            server = smtplib.SMTP(smtp_server, smtp_port)
        
        server.set_debuglevel(1) # Log SMTP interaction
        
        if use_tls and not use_ssl:
            server.starttls()
            
        if smtp_user and smtp_pass:
            server.login(smtp_user, smtp_pass)
            
        server.send_message(msg)
        server.quit()

        logger.info(f"Email sent successfully to {message.get('to')}")
        return jsonify({"success": True, "message": "Email sent"}), 200

    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Email Server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)

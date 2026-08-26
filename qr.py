import qrcode
import socket

def get_lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.254.254.254', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

lan_ip = get_lan_ip()
# Dynamic registration URL for LAN clients
data = f"http://{lan_ip}:5173/register"

# Generate the QR code image
img = qrcode.make(data)

# Save the image as a PNG file
img.save("qrcode.png")

print(f"LAN IP detected: {lan_ip}")
print(f"QR Code generated for: {data}")
print("QR Code saved successfully as 'qrcode.png'!")


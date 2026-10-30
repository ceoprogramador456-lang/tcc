"""Configure Wi-Fi and the API over USB without echoing the password.

Install: python -m pip install pyserial
Example: python scripts/configure-esp32.py --port COM4 --ssid Escola --api-url http://192.168.1.10:3000/api
"""
import argparse
import getpass
import json
import time
from pathlib import Path

import serial


def main():
    parser = argparse.ArgumentParser(description="Configurar ESP32 do SIVA por USB")
    parser.add_argument("--port", required=True, help="COM4 no Windows, /dev/ttyUSB0 no Linux")
    parser.add_argument("--ssid", required=True)
    parser.add_argument("--api-url", required=True, help="URL do backend terminando em /api")
    parser.add_argument("--ca", type=Path, help="Certificado CA PEM para HTTPS")
    args = parser.parse_args()
    password = getpass.getpass("Senha do Wi-Fi (não será exibida): ")
    command = {"command": "configure", "ssid": args.ssid, "password": password,
               "apiUrl": args.api_url, "ca": args.ca.read_text() if args.ca else ""}
    with serial.Serial(args.port, 115200, timeout=0.5) as board:
        time.sleep(2)  # Most development boards reset when the USB port opens.
        board.reset_input_buffer()
        board.write((json.dumps(command) + "\n").encode())
        board.flush()
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            line = board.readline().decode(errors="replace").strip()
            if "Configuracao salva" in line:
                print("Configuração salva. Confira o código no OLED e aprove em Dispositivos → Conectar ESP32.")
                return
            if "invalida" in line or "Falha" in line:
                raise SystemExit("A placa recusou a configuração. Confira a URL, o certificado e o firmware.")
        raise SystemExit("Sem confirmação da placa. Confira a porta, feche o Monitor Serial e tente novamente.")


if __name__ == "__main__":
    main()

import subprocess
import sys
import os

# Obtén la ruta del archivo DOCX desde los argumentos de la línea de comandos
input_docx_path = sys.argv[1]

# Define la ruta de salida del archivo PDF
output_pdf_path = input_docx_path.replace('.docx', '.pdf')

# Realiza la conversión del archivo DOCX a PDF usando unoconv
try:
    subprocess.run(['unoconv', '-f', 'pdf', input_docx_path], check=True)
    if os.path.exists(output_pdf_path):
        print(output_pdf_path)  # Imprime la ruta del archivo PDF generado
    else:
        print("Error: El archivo PDF no se generó.")
except subprocess.CalledProcessError as e:
    print(f"Error durante la conversión: {e}")

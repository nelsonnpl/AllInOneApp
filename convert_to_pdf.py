from docx2pdf import convert
import sys

# Obtén la ruta del archivo DOCX desde los argumentos de la línea de comandos
input_docx_path = sys.argv[1]

# Realiza la conversión del archivo DOCX a PDF
output_pdf_path = input_docx_path.replace('.docx', '.pdf')
convert(input_docx_path, output_pdf_path)

print(output_pdf_path)  # Imprime la ruta del archivo PDF generado

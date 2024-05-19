#!/bin/bash

# Actualizar los repositorios e instalar herramientas necesarias
sudo apt update
sudo apt install -y curl gnupg2 wget

# Instalar Node.js y npm
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar Python y pip
sudo apt install -y python3 python3-pip

# Instalar paquetes de Python necesarios
pip3 install flask python-docx docx2pdf pizzip jsdom

# Instalar paquetes de Node.js necesarios
npm install --save multer pizzip docxtemplater uuid express

# Instalar LibreOffice (necesario para convertir de DOCX a PDF)
sudo apt install -y libreoffice

# Crear la carpeta de subidas si no existe
mkdir -p uploads

# Permisos de escritura para la carpeta de subidas
chmod 777 uploads

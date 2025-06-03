import PDFDocument from 'pdfkit';
import fs from 'fs';

export interface ClientContext {
  name?: string;
  age?: string;
  goal?: string;
  gender?: string;
  height?: string;
  weight?: string;
  [key: string]: any;
}

export async function generatePlanPDF(context: ClientContext, plan: string, pdfPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(pdfPath);
    doc.pipe(writeStream);
    doc.fontSize(18).text('Plano de Treino Personalizado', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Nome: ${context.name}`);
    doc.text(`Idade: ${context.age}`);
    doc.text(`Objetivo: ${context.goal}`);
    doc.text(`Gênero: ${context.gender}`);
    doc.text(`Altura: ${context.height} cm`);
    doc.text(`Peso: ${context.weight} kg`);
    doc.moveDown();
    doc.fontSize(14).text('Plano:', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(plan);
    doc.end();
    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });
} 
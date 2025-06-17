import PDFDocument from "pdfkit";
import { supabase } from "./supabaseService";

export interface ClientContext {
  name?: string;
  age?: string;
  goal?: string;
  gender?: string;
  height?: string;
  weight?: string;
  [key: string]: any;
}

export interface PlanData {
  id: string;
  client_id: string;
  type: string;
  content: string;
  created_at: string;
  expires_at?: string;
}

// Gerar PDF do plano e retornar como base64 (versão simplificada)
export async function generateAndUploadPlanPDF(
  planData: PlanData,
  clientContext: ClientContext
): Promise<string> {
  try {
    console.log(`🔍 Gerando PDF para plano: ${planData.id}`);

    // Criar o PDF em memória
    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: `Plano ${planData.type} - ${clientContext.name || "Cliente"}`,
        Author: "AI Bot",
        Subject: `Plano Personalizado de ${planData.type}`,
        Keywords: "treino, nutrição, fitness, personalizado",
        CreationDate: new Date(),
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    // Adicionar cabeçalho
    doc
      .fontSize(24)
      .font("Helvetica-Bold")
      .fillColor("#1f2937")
      .text(`Plano de ${planData.type} Personalizado`, { align: "center" });

    doc.moveDown(0.5);

    // Linha decorativa
    doc
      .strokeColor("#3b82f6")
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown();

    // Informações do cliente
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#374151")
      .text("Dados do Cliente", { underline: true });

    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica").fillColor("#4b5563");

    const clientInfo = [
      { label: "Nome", value: clientContext.name || "Não informado" },
      {
        label: "Idade",
        value: clientContext.age
          ? `${clientContext.age} anos`
          : "Não informado",
      },
      { label: "Gênero", value: clientContext.gender || "Não informado" },
      {
        label: "Altura",
        value: clientContext.height
          ? `${clientContext.height} cm`
          : "Não informado",
      },
      {
        label: "Peso",
        value: clientContext.weight
          ? `${clientContext.weight} kg`
          : "Não informado",
      },
      { label: "Objetivo", value: clientContext.goal || "Não informado" },
    ];

    clientInfo.forEach(({ label, value }) => {
      doc.text(`${label}: ${value}`);
    });

    doc.moveDown();

    // Informações do plano
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#374151")
      .text("Detalhes do Plano", { underline: true });

    doc.moveDown(0.3);
    doc.fontSize(12).font("Helvetica").fillColor("#4b5563");

    doc.text(`Tipo: ${planData.type}`);
    doc.text(
      `Criado em: ${new Date(planData.created_at).toLocaleDateString("pt-BR")}`
    );

    if (planData.expires_at) {
      doc.text(
        `Válido até: ${new Date(planData.expires_at).toLocaleDateString(
          "pt-BR"
        )}`
      );
    }

    doc.moveDown();

    // Conteúdo do plano
    doc
      .fontSize(16)
      .font("Helvetica-Bold")
      .fillColor("#374151")
      .text("Plano Detalhado", { underline: true });

    doc.moveDown(0.3);
    doc
      .fontSize(11)
      .font("Helvetica")
      .fillColor("#1f2937")
      .text(planData.content, {
        align: "justify",
        lineGap: 2,
      });

    doc.moveDown();

    // Rodapé

    doc.moveDown(0.5);
    doc.fontSize(8).text(`ID do Plano: ${planData.id}`, { align: "center" });

    // Finalizar o PDF
    doc.end();

    // Aguardar todos os chunks e retornar como base64
    return new Promise((resolve, reject) => {
      doc.on("end", async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          console.log(`📄 PDF gerado com ${pdfBuffer.length} bytes`);

          // Converter para base64
          const base64PDF = pdfBuffer.toString("base64");
          const dataUrl = `data:application/pdf;base64,${base64PDF}`;

          console.log(`✅ PDF gerado com sucesso como base64`);
          resolve(dataUrl);
        } catch (error) {
          console.error("❌ Erro ao processar PDF:", error);
          reject(error);
        }
      });

      doc.on("error", (error) => {
        console.error("❌ Erro ao gerar PDF:", error);
        reject(error);
      });
    });
  } catch (error) {
    console.error("❌ Erro ao gerar PDF:", error);
    throw error;
  }
}

// Gerar PDF simples (versão de fallback)
export async function generatePlanPDF(
  context: ClientContext,
  plan: string,
  pdfPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const writeStream = require("fs").createWriteStream(pdfPath);
    doc.pipe(writeStream);

    doc.fontSize(18).text("Plano de Treino Personalizado", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Nome: ${context.name}`);
    doc.text(`Idade: ${context.age}`);
    doc.text(`Objetivo: ${context.goal}`);
    doc.text(`Gênero: ${context.gender}`);
    doc.text(`Altura: ${context.height} cm`);
    doc.text(`Peso: ${context.weight} kg`);
    doc.moveDown();
    doc.fontSize(14).text("Plano:", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(plan);
    doc.end();

    writeStream.on("finish", resolve);
    writeStream.on("error", reject);
  });
}

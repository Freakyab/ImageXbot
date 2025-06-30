"use server";
import { createPartFromUri, Type } from "@google/genai";
import axios from "axios";
import { ai } from "@/lib/google";

export async function analysis(
  files: Array<{ url: string; public_id: string }>
) {
  try {
    if (!files || files.length === 0) {
      throw new Error("At least one file is required for analysis.");
    }

    // Schedule deletion for each file
    files.forEach(({ public_id }) => {
      const deleteFile = async () => {
        try {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const deleteCloudinaryFile = await axios.delete(
            "http://localhost:8000/delete-pdf",
            {
              data: { public_id },
              headers: { "Content-Type": "application/json" },
            }
          );
          console.log("Deleted file:", public_id);
        } catch (error) {
          console.error(`Error deleting file (${public_id}):`, error);
        }
      };
      setTimeout(deleteFile, 5000);
    });

    // Upload all files
    const uploadedFiles = await Promise.all(
      files.map(async ({ url }) => {
        const pdfBuffer = await fetch(url).then((res) => res.arrayBuffer());
        const fileBlob = new Blob([pdfBuffer], { type: "application/pdf" });
        const uploaded = await ai.files.upload({
          file: fileBlob,
          config: { displayName: "expense.pdf" },
        });

        if (!uploaded.name) throw new Error("File name is undefined");

        // Wait for processing
        let getFile = await ai.files.get({ name: uploaded.name });
        while (getFile.state === "PROCESSING") {
          console.log(`Processing ${uploaded.name}...`);
          await new Promise((resolve) => setTimeout(resolve, 5000));
          getFile = await ai.files.get({ name: uploaded.name });
        }

        if (getFile.state === "FAILED")
          throw new Error("File processing failed.");

        return getFile;
      })
    );

    // Prepare content
    const content: Array<string | ReturnType<typeof createPartFromUri>> = [
      `Analyze the attached bank statement PDF and extract the following information:
  1. Account holder's name.
  2. Starting and ending date of the expense period.
  3. Beginning and ending balance.
  4. All transactions, including:
      - Bank name (if available)
    - Date (format: DD/MM/YYYY)
    - Description
    - Ref No. or Cheque No. or Instrument ID
    - Amount
    - Whether it's a credit or debit (as 'category')
    - Balance after transaction
    - AI-generated category (like food, travel, petrol, etc.) based on the description.
    5. Provide a summary of the expense analysis, like remaining balance, highest expense, recurring expenses, etc.
    also add short summary of the expense analysis in the beginning
    .
Return this data in structured JSON format as per the defined schema.
remeber all the transactions are in INR currency and the amount is in rupees.
    If any information is not available, indicate it as "NA" in the respective field.
`,
    ];

    // Add each file's content
    uploadedFiles.forEach((file) => {
      if (file.uri && file.mimeType) {
        const fileContent = createPartFromUri(file.uri, file.mimeType);
        content.push(fileContent);
      }
    });

    // Request structured JSON analysis
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: content,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: "Summary of the expense analysis",
            },
            account_Name: {
              type: Type.STRING,
              description: "Name of the account holder",
            },
            starting_date: {
              type: Type.STRING,
              description: "Starting date of the expense period",
            },
            ending_date: {
              type: Type.STRING,
              description: "Ending date of the expense period",
            },
            beginning_balance: {
              type: Type.NUMBER,
              description: "Beginning balance of the account",
            },
            ending_balance: {
              type: Type.NUMBER,
              description: "Ending balance of the account",
            },
            transactions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  bank_Name: {
                    type: Type.STRING,
                    description:
                      "Get name of the bank from IFSC Code or IFS Code, or if previously mentioned, use that. Use abbreviation if available.",
                  },
                  date: {
                    type: Type.STRING,
                    description: "Date of the particular transaction",
                  },
                  description: {
                    type: Type.STRING,
                    description: "Description of the particular transaction",
                  },
                  ref_No: {
                    type: Type.STRING,
                    description:
                      "Ref No./ChequeNo./Instrument ID of the particular transaction",
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: "Amount of the particular transaction",
                  },
                  ai: {
                    type: Type.STRING,
                    description: `create an suitable category for the particular transaction as per description like petrol, food, etc.
                      Go through the each words of description and find the most relevant category.
                      If the description is not clear, use a general category like 'other' or 'miscellaneous'.
                      If the description includes an shop name or a person name, use that as the category.
                      `,
                  },
                  category: {
                    type: Type.STRING,
                    description:
                      "Category of the particular transaction (credit/debit). remember CR is credit and DR is debit",
                  },
                  balance_after_Transaction: {
                    type: Type.NUMBER,
                    description: "Balance after the particular transaction",
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = response.text;
    if (!result) throw new Error("No response from AI model.");

    const parsedResult = JSON.parse(result);
    if (!parsedResult || typeof parsedResult !== "object") {
      throw new Error("Parsed result is not a valid object.");
    }

    return parsedResult;
  } catch (error) {
    console.error("Error in analysis:", error);
    return;
  }
}

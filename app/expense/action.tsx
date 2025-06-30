"use server";
import { createPartFromUri, Type } from "@google/genai";
import axios from "axios";
import { ai } from "@/lib/google";

export async function analysis({
  url,
  public_id,
}: {
  url: string;
  public_id: string;
}) {
  try {
    if (!url) {
      throw new Error("URL is required for analysis.");
    }
    if (!public_id) {
      throw new Error("Public ID is required for analysis.");
    }

    // Schedule file deletion in the background
    const deleteFile = async () => {
      try {
        // Wait 5 seconds before deleting
        await new Promise((resolve) => setTimeout(resolve, 5000));

        const deleteCloudinaryFile = await axios.delete(
          `http://localhost:8000/delete-pdf`,
          {
            data: {
              public_id: public_id,
            },
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        console.log("File deleted");
        console.log(deleteCloudinaryFile.data);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    };

    // Execute deletion without waiting for it to complete
    setTimeout(deleteFile, 5000);

    const pdfBuffer = await fetch(url).then((response) =>
      response.arrayBuffer()
    );

    const fileBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const file = await ai.files.upload({
      file: fileBlob,
      config: {
        displayName: "expense.pdf",
      },
    });

    if (!file.name) {
      throw new Error("File name is undefined");
    }

    let getFile = await ai.files.get({ name: file.name });
    while (getFile.state === "PROCESSING") {
      getFile = await ai.files.get({ name: file.name });
      console.log(`current file status: ${getFile.state}`);
      console.log("File is still processing, retrying in 5 seconds");

      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
    if (getFile.state === "FAILED") {
      throw new Error("File processing failed.");
    }
    // Add the file to the contents.
    const content: Array<string | ReturnType<typeof createPartFromUri>> = [
      `Analyze the attached bank statement PDF and extract the following information:
  1. Account holder's name.
  2. Starting and ending date of the expense period.
  3. Beginning and ending balance.
  4. All transactions, including:
    - Date
    - Description
    - Ref No. or Cheque No.
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

    if (file.uri && file.mimeType) {
      const fileContent = createPartFromUri(file.uri, file.mimeType);

      content.push(fileContent);
    }
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
                      "Ref No./ChequeNo. of the particular transaction",
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: "Amount of the particular transaction",
                  },
                  ai: {
                    type: Type.STRING,
                    description:
                      "create an suitable category for the particular transaction as per description like petrol, food, etc.",
                  },
                  category: {
                    type: Type.STRING,
                    description:
                      "Category of the particular transaction (credit/debit)",
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
    // console.log(response.text);

    if (!result) {
      throw new Error("No result returned from the AI model.");
    }
    const parsedResult = JSON.parse(result);
    if (!parsedResult || typeof parsedResult !== "object") {
      throw new Error("Parsed result is not a valid object.");
    }

    return parsedResult;
  } catch (error) {
    console.error("Error during analysis:", error);
    return;
  }
}

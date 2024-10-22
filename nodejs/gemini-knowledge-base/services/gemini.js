import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager, GoogleAICacheManager } from "@google/generative-ai/server";
import fs from "fs/promises";
import path from "path";

class GeminiAI {
    constructor(apiKey, cache = null) {
        if (!apiKey) {
            throw new Error("API key is required");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.fileManager = new GoogleAIFileManager(apiKey);
        this.cacheManager = new GoogleAICacheManager(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });
        this.conversationHistory = [];
        this.cache = cache;
        this.cachedModel = cache ? this.genAI.getGenerativeModelFromCachedContent(cache) : null;
    }

    async getExistingFiles() {
        if (!this.existingFilesCache) {
            console.log("Fetching existing files...");
            
            try {
                const files = await this.fileManager.listFiles();
    
                if (!files || !Array.isArray(files.files)) {
                    console.error("Invalid files structure:", files);
                    this.existingFilesCache = {};
                    return this.existingFilesCache;
                }
    
                this.existingFilesCache = files.files.reduce((acc, file) => {
                    acc[file.displayName] = file;
                    return acc;
                }, {});
            } catch (error) {
                console.error("Error fetching files:", error);
                this.existingFilesCache = {};
            }
        }
        return this.existingFilesCache;
    }

    async resetFiles() {
        const fileList = await this.fileManager.listFiles();
        const deletePromises = fileList.files?.map(file =>
            this.fileManager.deleteFile(file.name)
        ) ?? [];
        return Promise.allSettled(deletePromises);
    }

    async getFilesFromDocsFolder(folderPath = "docs/") {
        try {
            const files = await fs.readdir(folderPath);
            return files.map(file => ({
                filePath: path.join(folderPath, file),
                mimeType: this.getMimeType(file),
            }));
        } catch (error) {
            console.error(`Failed to scan folder ${folderPath}:`, error);
            throw error;
        }
    }

    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        switch (ext) {
            case ".txt": return "text/plain";
            case ".pdf": return "application/pdf";
            case ".md": return "text/markdown";
            default: return "application/octet-stream";
        }
    }

    async uploadFileIfNotExists(filePath) {
        const fileName = path.basename(filePath);
        const displayName = fileName.substring(0, fileName.lastIndexOf('.'));

        try {
            await fs.access(filePath);
            const existingFiles = await this.getExistingFiles();
            if (existingFiles[displayName]) {
                console.log(`Using existing file: ${displayName}`);
                return existingFiles[displayName];
            }

            console.log(`Uploading file: ${displayName}`);
            const uploadResult = await this.fileManager.uploadFile(filePath, {
                mimeType: this.getMimeType(fileName),
                displayName,
            });
            return uploadResult.file;
        } catch (error) {
            console.error(`Error uploading or checking file: ${error.message}`);
            return null;
        }
    }

    async uploadDocsFolder(folderPath = "docs/") {
        const files = await this.getFilesFromDocsFolder(folderPath);
        const uploadPromises = files.map(file => this.uploadFileIfNotExists(file.filePath));
        const uploadedFiles = await Promise.all(uploadPromises);
        return uploadedFiles.filter(Boolean);
    }

    async createCacheContext(files, ttlSeconds = 300) {
        try {
            console.log("Creating cache context...");
            const cache = await this.cacheManager.create({
                model: "models/gemini-1.5-flash-002",
                displayName: "docs-analysis",
                systemInstruction: "You are a helpful knowledge base assistant, provide answers based on the given context. Keep your answers to 1 or 2 sentences.",
                contents: files.map(file => ({
                    role: "user",
                    parts: [{ fileData: { mimeType: file.mimeType, fileUri: file.uri } }],
                })),
                ttlSeconds,
            });

            console.log("Cache created successfully.");
            return cache;
        } catch (error) {
            console.error("Failed to create cache:", error);
            throw error;
        }
    }

    async generateContent(promptText, temperature = 0.7) {
        if (!this.cachedModel) {
            throw new Error("Cached model not initialized. Create the cache first.");
        }

        const contents = [
            { role: "user", parts: [{ text: promptText }] },
            ...this.conversationHistory,
        ];

        try {
            console.log("Generating content...");
            const result = await this.cachedModel.generateContent({
                contents,
                generationConfig: { temperature, maxOutputTokens: 1024 },
            });

            const assistantResponse = result.response.text();
            console.log("Generated Content:", assistantResponse);

            this.conversationHistory.push({ role: "user", parts: [{ text: promptText }] });
            this.conversationHistory.push({ role: "model", parts: [{ text: assistantResponse }] });

            return assistantResponse;
        } catch (error) {
            console.error("Content generation failed:", error);
            throw error;
        }
    }
}

export default GeminiAI;
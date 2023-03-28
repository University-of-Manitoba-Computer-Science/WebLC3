/**
 * armAssembler.ts
 *
 * Converts program source code into a binary object file, which consists of the
 * starting address of the program followed by the assembled machine code. It
 * also generates a Map with memory addresses as the keys and corresponding
 * lines of source code as the values, which is used to display the code
 * alongside the computer's memory in the simulator user interface.
 *
 * The algorithms used here are very similar to the LC-3 Assembler class, but
 * there are certain subtle differences in the languages' directives and opcodes
 * that make it so this needs to be a separate class.
 */

import Parser from "./parser";
import UI from "../../presentation/ui";
import ErrorBuilder from "./errorBuilder";
import ArmParser from "./armParser";

export default class ARMAssembler
{
    // All valid opcodes including trap aliases
    private static opCodes = new Set([
        "adc", "add", "and", "asr", "b",
        "beq", "bne", "bcs", "bcc", "bmi", "bpl", "bvs", "bvc", "bhi", "bls", "bge", "blt", "bgt", "ble",
        "bic",
        "swi"
    ]);

    // All valid assembler directives
    private static directives = new Set([
        ".text", ".global"
    ])

    /*
     All instructions and directives mapped to the number of operands they take. Instructions not mapped here can take a
     variable number of operands and are handled in this.validOperandCount.
    */
    private static operandCounts = new Map([
        ["adc", 2], ["and", 2], ["b", 1],

        ["beq", 1], ["bne", 1], ["bcs", 1], ["bcc", 1], ["bmi", 1], ["bpl", 1], ["bvs", 1], ["bvc", 1], ["bhi", 1],
        ["bls", 1], ["bge", 1], ["blt", 1], ["bgt", 1], ["ble", 1],

        ["bic", 2], ["swi", 1],

        [".text", 0], [".global", 1]
    ]);

    // Errors where assembly cannot begin for given file
    private static errors = {
        INFILE: "Source code is empty",
    };

    // The most recently saved object file
    private static lastObjectFile: Blob | null = null;
    // The most recently saved symbol table
    private static lastSymbolTable: Blob | null = null;

    /**
     * Assemble the given ARM source code.
     *
     * If there are errors in the code, print errors to the editor
     * console and return [null, null].
     * If the code is assembled successfully: print a success message
     * to the editor console, return the resulting object file as a
     * Uint16Array and a Map of memory addresses mapped to the source
     * code that was assembled and placed at that address.
     * @param {string} sourceCode the code to assemble
     * @param {boolean} saveFiles if true (default), save the resulting object file and symbol table
     * @returns {Promise<[Uint16Array, Map<number, string>] | null>}
     */
    public static async assemble(sourceCode: string, saveFiles: boolean = true)
        : Promise<[Uint16Array, Map<number, string>] | null>
    {
        let hasError = false;

        // Since we're assembling a new program, delete the previously saved object and symbol table files
        if (saveFiles)
        {
            this.lastObjectFile = null;
            this.lastSymbolTable = null;
        }

        const sourceLines = sourceCode.split(/[\r]?[\n]/);
        if (sourceLines.length == 1 && sourceLines[0] == '')
        {
            UI.appendConsole(this.errors.INFILE + "\n");
            return null;
        }
        // Object to generate error messages
        const errorBuilder = new ErrorBuilder(sourceLines);
        // Parses the source code
        const parser = new ArmParser(errorBuilder);

        // Stores the resulting machine code / binary data
        const memory: number[] = [];
        // Maps label names to the address of the label
        const labels: Map<string, number> = new Map();
        /*
         Maps line tokens with label operands to the memory location they're in. After the first pass, we'll revisit
         these to fix the offset values.
         */
        const toFix: Map<string[], number> = new Map();
        // Maps memory locations to the source code they contain
        const addressToCode: Map<number, string> = new Map();
        // Maps memory locations to line numbers so we can print line numbers if an error occurs while fixing labels
        const addressToLineNumber: Map<number, number> = new Map();

        // Memory location of the first line of code
        let startOffset = 0;
        // Index in sourceCode of the line we're currently parsing
        let lineNumber = -1;
        // Index in memory of the word we're currently writing
        let pc = 0;

        while (++lineNumber < sourceLines.length)
        {
            let currentLine = Parser.trimLine(sourceLines[lineNumber]);
            if (currentLine)
            {
                addressToLineNumber.set(pc, lineNumber);

                const tokens = Parser.tokenizeLine(currentLine);
                // Label
                if (tokens[0][0] != '.' && !this.opCodes.has(tokens[0]))
                {
                    labels.set(tokens[0], pc);
                    // Remove label from line
                    tokens.shift();
                    if (tokens.length == 0)
                        continue;
                }

                // Assembler directive
                if (this.directives.has(tokens[0]))
                {
                    if (!this.validOperandCount(tokens))
                    {
                        UI.appendConsole(errorBuilder.operandCount(lineNumber, tokens) + "\n");
                        hasError = true;
                        continue;
                    }

                    const pcIncrement = parser.parseDirective(lineNumber, tokens, pc, memory, toFix);
                    if (pcIncrement <= 0)
                    {
                        hasError == true;
                    }
                    else
                    {
                        pc += pcIncrement;
                    }
                }
                // Instruction
                else if (this.opCodes.has(tokens[0]))
                {
                    if (!this.validOperandCount(tokens))
                    {
                        UI.appendConsole(errorBuilder.operandCount(lineNumber, tokens) + "\n");
                        hasError = true;
                        continue;
                    }
                    const word = parser.parseCode(lineNumber, tokens, pc, labels, toFix);
                    if (!isNaN(word))
                    {
                        memory[pc] = word;
                        addressToCode.set(pc + startOffset, currentLine);
                    }
                    else
                    {
                        UI.appendConsole(errorBuilder.nanMemory(lineNumber, pc) + "\n");
                        memory[pc] = 0;
                        hasError = true;
                    }
                    ++pc;
                }
                else
                {
                    UI.appendConsole(errorBuilder.unknownMnemonic(lineNumber, tokens[0]) + "\n");
                    hasError = true;
                }
            }
        }

        // Load resulting machine code into Uint16Array and return it
        const result = new Uint16Array(memory.length + 1);
        result[0] = startOffset;
        let lastLineNumber: number = 0;
        for (let i = 0; i < memory.length; i++)
        {
            if (addressToLineNumber.has(i))
            {
                // @ts-ignore
                lastLineNumber = addressToLineNumber.get(i);
            }

            if (memory[i] > 0xffff)
            {
                UI.appendConsole(errorBuilder.badMemory(lastLineNumber, i + startOffset, memory[i]) + "\n");
                hasError = true;
                result[i + 1] = 0;
            }
            else if (isNaN(memory[i]))
            {
                UI.appendConsole(errorBuilder.nanMemory(lastLineNumber, i + startOffset) + "\n");
                hasError = true;
                result[i + 1] = 0;
            }
            else
            {
                result[i + 1] = memory[i];
            }
        }

        // Verify the brute-force example
        let identical = true;
        const expectedBinary = [
            0,                       // Leading zero
            0b010000_0101_000_001,   // adc r0, r1
            0b001_10_000_00000001,   // add r0, #1
            0b010001_00_0_1_000_000, // add r0, h0
            0b1010_1_001_00000001,   // add r1, sp, #1
            0b10110000_1_0000010,    // add sp, #-2
            0b010000_0000_001_010,   // and r1, r2
            0b000_10_00101_001_010,  // asr r1, r2, #5
            0b010000_0100_001_010,   // asr r1, r2
            0b11100_11111110111,     // b _start
            0b1101_0000_11110110,    // beq _start
            0b1101_0001_11110101,    // bne _start
            0b1101_0010_11110100,    // bcs _start
            0b1101_0011_11110011,    // bcc _start
            0b1101_0100_11110010,    // bmi _start
            0b1101_0101_11110001,    // bpl _start
            0b1101_0110_11110000,    // bvs _start
            0b1101_0111_11101111,    // bvc _start
            0b1101_1000_11101110,    // bhi _start
            0b1101_1001_11101101,    // bls _start
            0b1101_1010_11101100,    // bge _start
            0b1101_1011_11101011,    // blt _start
            0b1101_1100_11101010,    // bgt _start
            0b1101_1101_11101001,    // ble _start
            0b010000_1110_010_011,   // bic r2, r3
            0b11011111_00001011,     // swi 11
        ]
        console.log(labels);
        console.log(expectedBinary);
        console.log(result);
        console.log(addressToCode);
        for (let i = 0; i < expectedBinary.length; i++)
        {
            if (result[i] != expectedBinary[i])
            {
                identical = false;
                console.log("Comparison failed for instruction '" + addressToCode.get(i-1) + "': expected " + expectedBinary[i].toString(16) + ", got " + result[i].toString(16))
            }
        }
        if (identical)
        {
            console.log("All instructions assembled as expected :)");
        }

        if (hasError)
            return null;
        else
        {
            if (saveFiles)
            {
                // Save object and symbol table blobs
                await this.makeObjectFileBlob(result);
                await this.makeSymbolTableBlob(labels, startOffset);
            }
            UI.printConsole("Assembly successful. \n");
            return [result, addressToCode]
        }

    }

    /**
     * Assuming tokens[0] is a valid instruction, return true if there are a valid number of operands following it
     * @param {string[]} tokens
     * @returns {boolean}
     */
    public static validOperandCount(tokens: string[]): boolean
    {
        if (tokens[0] == "add")
            return tokens.length == 3 || tokens.length == 4;
        else if (tokens[0] == "asr")
            return tokens.length == 3 || tokens.length == 4;
        else
        {
            const result = (tokens.length - 1) == this.operandCounts.get(tokens[0]);
            return result;
        }
    }

    /**
     * Converts object file into a blob that can be downloaded
     * @param {Uint16Array} object
     */
    private static async makeObjectFileBlob(object: Uint16Array)
    {
        let objectString = "";
        // Convert numbers to base-16 strings, add leading zeroes
        for (let i = 0; i < object.length; i++)
        {
            let currentLine = object[i].toString(16);
            while (currentLine.length < 4)
                currentLine = "0" + currentLine;

            if (i % 8 == 7)
            {
                currentLine += '\n';
            }
            else
            {
                currentLine += ' ';
            }
            objectString += currentLine;
        }
        this.lastObjectFile = new Blob(Array.from(objectString.trim() + '\n'), { type: "text/plan" });
    }

    /**
     * Given a mapping of labels to memory addresses, creates a plain text symbol table blob
     * @param {Map<string, number>} labels
     * @param {number} startOffset
     */
    private static async makeSymbolTableBlob(labels: Map<string, number>, startOffset: number)
    {
        let table = "";
        for (let pair of labels)
        {
            let label = pair[0];
            let address = (pair[1] + startOffset).toString(16);
            table += label + " = " + address + "\n";
        }
        this.lastSymbolTable = new Blob(Array.from(table), { type: "text/plain" });
    }
}
/**
 * armAssembler.ts
 *
 * Converts program source code into a binary object file, which consists of the
 * starting address of the program followed by the assembled machine code. It
 * also generates a Map with memory addresses as the keys and corresponding
 * lines of source code as the values, which is used to display the code
 * alongside the computer's memory in the simulator user interface.
 */

import Parser from "./parser";
import UI from "../../presentation/ui";
import ErrorBuilder from "./errorBuilder";
import ArmParser from "./armParser";

export default class ARMAssembler
{
    // All valid opcodes including trap aliases
    private static opCodes = new Set([
        "add", "swi"
    ]);

    // All instructions mapped to the number of operands they take
    private static operandCounts = new Map([
        ["add", 2], ["swi", 1]
    ]);

    // Errors where assembly cannot begin for given file
    private static errors = {
        INFILE: "Source code is empty",
    };

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
        let lineNumber = 0;
        // Index in memory of the word we're currently writing
        let pc = 0;

        let currentLine = Parser.trimLine(sourceLines[lineNumber]);

        while (++lineNumber < sourceLines.length)
        {
            currentLine = Parser.trimLine(sourceLines[lineNumber]);
            if (currentLine)
            {
                addressToLineNumber.set(pc, lineNumber);

                const tokens = Parser.tokenizeLine(currentLine);

                // Instruction
                if (this.opCodes.has(tokens[0]))
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
                lastLineNumber = addressto
            }
        }



        result[0] = 0;
        result[1] = 0b0011000000000001;
        addressToCode.set(0, "add r0, #1");
        result[2] = 0b1101111100001011;
        addressToCode.set(1, "swi #11");

        console.log(result);

        if (hasError)
            return null;

        return [result, addressToCode]
    }

    /**
     * Assuming tokens[0] is a valid instruction, return true if there are a valid number of operands following it
     * @param {string[]} tokens
     * @returns {boolean}
     */
    public static validOperandCount(tokens: string[]): boolean
    {
        const result = (tokens.length - 1) == this.operandCounts.get(tokens[0]);
        return result;
    }
}
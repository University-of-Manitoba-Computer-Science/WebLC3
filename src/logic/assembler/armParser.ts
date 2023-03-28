/**
 * armParser.ts
 *
 * Splits lines of source code into individual tokens and converts tokenized source code into machine code
 */

import Parser from "./parser";

export default class ArmParser extends Parser
{
    /**
     * Converts a line of source code into machine code.
     * Given a tokenized line of source code, the location of the instruction (given by pc), the known labels in the
     * program, and the map containing labels which have yet to be defined, return the resulting machine code for that
     * instruction.
     * @param {number} lineNum
     * @param {string[]} tokens
     * @param {number} pc
     * @param {Map<string, number>} labels
     * @param {Map<string[], number>} toFix
     * @returns {number}
     */
    public override parseCode(lineNum: number, tokens: string[], pc: number, labels: Map<string, number>, toFix: Map<string[], number>): number {
        switch (tokens[0])
        {
            // Format 3: move/compare/add/subtract immediate
            case "add":
                return this.asmFormat3(lineNum, tokens);

            // Format 17: Software interrupt
            case "swi":
                return this.asmFormat17(lineNum, tokens);
            default:
                return NaN;
        }
    }

    /**
     * Generates machine code for an instruction in format 3 (move/compare/add/subtract immediate)
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat3(lineNumber: number, tokens: string[]): number
    {
        let result = 0b0010000000000000;

        // Opcode
        let opcode = 0;
        switch (tokens[0])
        {
            case "add": opcode = 0b10; break;
        }
        result |= (opcode << 11);

        // Source/destination register
        const register = this.parseReg(tokens[1], lineNumber);
        if (isNaN(register))
            return NaN;
        result |= (register << 9);

        // Immediate value
        const immediate = this.parseImmediate(tokens[2], true, lineNumber, 8)
        result |= immediate;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 17 (software interrupt)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat17(lineNumber: number, tokens: string[]): number
    {
        let result = 0b1101111100000000;

        // Interrupt vector
        const value = parseInt(tokens[1])
        if (isNaN(value))
            return NaN;
        result |= value;

        return result;
    }

    /**
     * Given a tokenized line of source code with an assembler directive, handle its effects and return the amount
     * that the program counter must be increased by after the operation.
     *
     * Assumes that the number of operands is valid.
     * @param {number} lineNum
     * @param {string[]} tokens
     * @param {number} pc
     * @param {number[]} memory
     * @param {Map<string[], number>} toFix
     */
    public parseDirective(lineNum: number, tokens: string[], pc: number, memory: number[], toFix: Map<string[], number>): number
    {
        let increment = 0;

        switch (tokens[0])
        {

        }

        return increment;
    }
}
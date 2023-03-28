/**
 * armParser.ts
 *
 * Splits lines of source code into individual tokens and converts tokenized source code into machine code
 */

import Parser from "./parser";
import UI from "../../presentation/ui";

export default class ArmParser extends Parser
{
    /**
     * Parses a register operand and returns the register number
     * @param {string} regStr
     * @param {number} lineNum
     * @returns {number}
     */
    protected override parseReg(registerString: string, lineNumber: number): number
    {
        // Parse high register or defer to the LC-3 register parser
        if (registerString[0] == 'h' || registerString == 'H')
        {
            const registerNumber = parseInt(registerString.substring(1));
            if (isNaN(registerNumber) || registerNumber < 0 || registerNumber >= 8)
            {
                UI.appendConsole(this.errorBuilder.badRegister(lineNumber, registerString) + "\n");
                return NaN;
            }
            else
            {
                return NaN;
            }
        }
        else
            return super.parseReg(registerString, lineNumber);
    }

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
            case "add":
                return this.parseAdd(lineNum, tokens);
            case "adc":
                return this.asmFormat4(lineNum, tokens);
            case "swi":
                return this.asmFormat17(lineNum, tokens);
            default:
                return NaN;
        }
    }

    /**
     * Parses machine code in the appropriate format for an add instruction
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private parseAdd(lineNumber: number, tokens: string[]): number
    {
        if (tokens.length == 3)
        {
            if (tokens[2][0] == "#")
                // Format 13
                if (tokens[1].toLowerCase() == "sp")
                    return this.asmFormat13(lineNumber, tokens);
                // Format 3
                else
                    return this.asmFormat3(lineNumber, tokens);
            // Format 5
            if (tokens[1][0].toLowerCase() == 'h' || tokens[2][0].toLowerCase() == 'h')
                return this.asmFormat5(lineNumber, tokens);
        }
        // Format 12
        else if (tokens.length == 4)
        {
            return this.asmFormat12(lineNumber, tokens);
        }

        return NaN;
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
            default: return NaN;
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
     * Generates machine code for an instruction in format 4 (ALU operation)
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat4(lineNumber: number, tokens: string[]): number
    {
        let result = 0b0100000000000000;

        // Opcode
        let opcode = 0;
        switch (tokens[0])
        {
            case "adc": opcode = 0b0101; break;
            default: return NaN;
        }
        result |= (opcode << 6);

        // Source register 2
        const sourceRegister2 = this.parseReg(tokens[1], lineNumber);
        if (isNaN(sourceRegister2))
            return NaN;
        result |= (sourceRegister2 << 3);

        // Source/destination register
        const sourceDestinationRegister = this.parseReg(tokens[2], lineNumber);
        if (isNaN(sourceDestinationRegister))
            return NaN;
        result |= sourceDestinationRegister;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 5 (Hi register operation/branch exchange)
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat5(lineNumber: number, tokens: string[]): number
    {
        let result = 0b0100010000000000;

        // Opcode
        let opcode = 0;
        switch (tokens[0])
        {
            case "add": opcode = 0b00; break;
            default: return NaN;
        }
        result |= (opcode << 8);

        // Hi operand flag 1
        let h1 = 0;
        if (tokens[1][0].toLowerCase() == 'h')
        {
            h1 = 1;
        }
        result |= (h1 << 7);

        // Hi operand flag 2
        let h2 = 0;
        if (tokens[2][0].toLowerCase() == 'h')
        {
            h2 = 1;
        }
        result |= (h2 << 6);

        // Source register
        const sourceRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(sourceRegister))
            return NaN;
        result |= (sourceRegister << 3);

        // Destination register
        const destinationRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(destinationRegister))
            return NaN;
        result |= (destinationRegister << 3);

        return result;
    }

    /**
     * Generates machine code for an instruction in format 12 (load address)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat12(lineNumber: number, tokens: string[]): number
    {
        let result = 0b1010000000000000;

        // Source
        let source = -1;
        if (tokens[2].toLowerCase() == "pc")
            source = 0;
        else if (tokens[2].toLowerCase() == "sp")
            source = 1;
        else
            return NaN;
        result |= (source << 11);

        // Destination register
        const destinationRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(destinationRegister))
            return NaN;
        result |= (destinationRegister << 8);

        // Immediate value
        const immediate = this.parseImmediate(tokens[3], true, lineNumber, 8)
        result |= immediate;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 13 (add offset to stack pointer)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat13(lineNumber: number, tokens: string[]): number
    {
        let result = 0b1011000000000000;

        // Immediate value (part 1)
        const immediate = parseInt(tokens[2].slice(1, tokens[2].length))

        // Sign flag
        let signFlag = 0;
        if (immediate < 0)
            signFlag = 1;
        result |= (signFlag << 7);

        console.log(immediate);
        console.log(Math.abs(immediate));

        // Immediate value (part 2)
        result |= (Math.abs(immediate));

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
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
     * Converts a line of source code into at least one line of machine code. Should generally be used instead of
     * parseCode, since this supports instructions that assemble into multiple words of machine code.
     * @param {number} lineNum
     * @param {string[]} tokens
     * @param {number} pc
     * @param {Map<string, number>} labels
     * @param {Map<string[], number>} toFix
     * @returns {number}
     */
    public parseInstruction(lineNumber: number, tokens: string[], pc: number, labels: Map<string, number>, toFix: Map<string[], number>): number[]
    {
        switch (tokens[0])
        {
            case "bl":
                return this.asmFormat19(lineNumber, tokens, pc, labels, toFix);
            default:
                return [this.parseCode(lineNumber, tokens, pc, labels, toFix)]
        }
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
            case "asr":
                return this.parseAsr(lineNum, tokens);
            case "cmp":
                return this.parseCmp(lineNum, tokens);
            case "ldr":
                return this.parseLdr(lineNum, tokens);
            case "ldrb":
                return this.parseLdrb(lineNum, tokens);
            case "ldrh":
                return this.parseLdrh(lineNum, tokens);
            case "lsl":
                return this.parseLsl(lineNum, tokens);
            case "lsr":
                return this.parseLsr(lineNum, tokens);
            case "adc":
            case "and":
            case "bic":
            case "cmn":
            case "eor":
                return this.asmFormat4(lineNum, tokens);
            case "bx":
                return this.asmFormat5(lineNum, tokens);
            case "ldsb":
            case "ldsh":
                return this.asmFormat8(lineNum, tokens);
            case "ldmia":
                return this.asmFormat15(lineNum, tokens);
            case "beq":
            case "bne":
            case "bcs":
            case "bcc":
            case "bmi":
            case "bpl":
            case "bvs":
            case "bvc":
            case "bhi":
            case "bls":
            case "bge":
            case "blt":
            case "bgt":
            case "ble":
                return this.asmFormat16(lineNum, tokens, pc, labels, toFix);
            case "swi":
                return this.asmFormat17(lineNum, tokens);
            case "b":
                return this.asmFormat18(lineNum, tokens, pc, labels, toFix);
            default:
                return NaN;
        }
    }

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
                return registerNumber;
            }
        }
        else
            return super.parseReg(registerString, lineNumber);
    }

    /**
     * Generates machine code in the appropriate format for an add instruction
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private parseAdd(lineNumber: number, tokens: string[]): number
    {
        if (tokens.length == 3)
        {
            if (this.isImmediate(tokens[2][0]))
                if (tokens[1].toLowerCase() == "sp")
                    return this.asmFormat13(lineNumber, tokens);
                else
                    return this.asmFormat3(lineNumber, tokens);
            if (tokens[1][0].toLowerCase() == 'h' || tokens[2][0].toLowerCase() == 'h')
                return this.asmFormat5(lineNumber, tokens);
        }
        else if (tokens.length == 4)
        {
            return this.asmFormat12(lineNumber, tokens);
        }

        return NaN;
    }

    /**
     * Generates machine code in the appropriate format for an asr instruction
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private parseAsr(lineNumber: number, tokens: string[]): number
    {
        if (tokens.length == 4)
            return this.asmFormat1(lineNumber, tokens);
        else if (tokens.length == 3)
            return this.asmFormat4(lineNumber, tokens);

        return NaN;
    }

    /**
     * Generates machine code in the appropriate format for a cmp instruction
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private parseCmp(lineNumber: number, tokens: string[]): number
    {
        if (this.isImmediate(tokens[2][0]))
            return this.asmFormat3(lineNumber, tokens);
        else
        {
            if (tokens[1][0].toLowerCase() == 'h' || tokens[2][0].toLowerCase() == 'h')
                return this.asmFormat5(lineNumber, tokens);
            else
                return this.asmFormat4(lineNumber, tokens);
        }
    }

    /**
     * Generates machine code in the appropriate format for an ldr instruction
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private parseLdr(lineNumber: number, tokens: string[]): number
    {
        if (tokens.length == 3)
            return this.asmFormat6(lineNumber, tokens);
        else
        {
            if (this.isImmediate(tokens[3]))
            {
                if (tokens[2] == "sp")
                    return this.asmFormat11(lineNumber, tokens);
                else
                    return this.asmFormat9(lineNumber, tokens);
            }
            else
                return this.asmFormat7(lineNumber, tokens);
        }
    }

    /**
     * Generates machine code in the appropriate format for an ldrb instruction
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private parseLdrb(lineNumber: number, tokens: string[]): number
    {
        if (this.isImmediate(tokens[3]))
            return this.asmFormat9(lineNumber, tokens);
        else
            return this.asmFormat7(lineNumber, tokens);
    }

    /**
     * Generates machine code in the appropriate format for an ldrh instruction
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private parseLdrh(lineNumber: number, tokens: string[]): number
    {
        if (this.isImmediate(tokens[3]))
            return this.asmFormat10(lineNumber, tokens);
        else
            return this.asmFormat8(lineNumber, tokens);
    }

    /**
     * Generates machine code in the appropriate format for an lsl instruction
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private parseLsl(lineNumber: number, tokens: string[]): number
    {
        if (tokens.length == 4)
            return this.asmFormat1(lineNumber, tokens);
        else
            return this.asmFormat4(lineNumber, tokens);
    }

    /**
     * Generates machine code in the appropriate format for an lsr instruction
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private parseLsr(lineNumber: number, tokens: string[]): number
    {
        if (tokens.length == 4)
            return this.asmFormat1(lineNumber, tokens);
        else
            return this.asmFormat4(lineNumber, tokens);
    }

    /**
     * Generates machine code for an instruction in format 1 (move shifted register)
     * @param {number} lineNum
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat1(lineNumber: number, tokens: string[]): number
    {
        let result = 0;

        // Opcode
        let opcode = 0;
        switch (tokens[0])
        {
            case 'lsl': opcode = 0b00; break;
            case 'lsr': opcode = 0b01; break;
            case 'asr': opcode = 0b10; break;
            default: return NaN;
        }
        result |= (opcode << 11);

        // Immediate value
        const immediate = this.parseImmediate(tokens[3], false, lineNumber, 5);
        result |= (immediate << 6);

        // Source register
        const sourceRegister = this.parseReg(tokens[1], lineNumber);
        result |= (sourceRegister << 3);

        // Destination register
        const destinationRegister = this.parseReg(tokens[2], lineNumber);
        result |= destinationRegister;

        return result;
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
            case "cmp": opcode = 0b01; break;
            default: return NaN;
        }
        result |= (opcode << 11);

        // Source/destination register
        const register = this.parseReg(tokens[1], lineNumber);
        if (isNaN(register))
            return NaN;
        result |= (register << 8);

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
            case "and": opcode = 0b0000; break;
            case "eor": opcode = 0b0001; break;
            case "lsl": opcode = 0b0010; break;
            case "lsr": opcode = 0b0011; break;
            case "adc": opcode = 0b0101; break;
            case "asr": opcode = 0b0100; break;
            case "cmp": opcode = 0b1010; break;
            case "cmn": opcode = 0b1011; break;
            case "bic": opcode = 0b1110; break;
            default: return NaN;
        }
        result |= (opcode << 6);

        // Source register 2
        const sourceRegister2 = this.parseReg(tokens[2], lineNumber);
        if (isNaN(sourceRegister2))
            return NaN;
        result |= (sourceRegister2 << 3);

        // Source/destination register
        const sourceDestinationRegister = this.parseReg(tokens[1], lineNumber);
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
            case "cmp": opcode = 0b01; break;
            case "bx":
                opcode = 0b11;
                // Workaround for the fact that bx only takes one operand
                tokens.push(tokens[1])
                break;
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
        const destinationRegister = this.parseReg(tokens[2], lineNumber);
        if (isNaN(destinationRegister))
            return NaN;
        result |= destinationRegister;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 6 (load/store with register offset)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat6(lineNumber: number, tokens: string[]): number
    {
        let result = 0b0100100000000000;

        // Destination register
        const destinationRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(destinationRegister))
            return NaN;
        result |= (destinationRegister << 8);

        // Immediate value
        const immediate = this.parseImmediate(tokens[2], false, lineNumber, 8)
        result |= immediate;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 7 (load/store with register offset)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat7(lineNumber: number, tokens: string[]): number
    {
        let result = 0b0101000000000000;

        // Flags
        let loadStoreFlag = 0;
        let byteWordFlag = 0;
        switch (tokens[0])
        {
            case "ldr":
                loadStoreFlag = 1;
                byteWordFlag = 0;
                break;
            case "ldrb":
                loadStoreFlag = 1;
                byteWordFlag = 1;
                break;
        }
        result |= (loadStoreFlag << 11);
        result |= (byteWordFlag << 10);

        // Offset register
        const offsetRegister = this.parseReg(tokens[3], lineNumber);
        if (isNaN(offsetRegister))
            return NaN;
        result |= (offsetRegister << 6);

        // Base register
        const baseRegister = this.parseReg(tokens[2], lineNumber);
        if (isNaN(baseRegister))
            return NaN;
        result |= (baseRegister << 3);

        // Source/destination register
        const sourceDestinationRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(sourceDestinationRegister))
            return NaN;
        result |= sourceDestinationRegister;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 8 (load/store sign-extended byte/halfword)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat8(lineNumber: number, tokens: string[]): number
    {
        let result = 0b0101001000000000;

        // Flags
        let hFlag = 0;
        let signExtendFlag = 0;
        switch (tokens[0])
        {
            case "ldrh":
                hFlag = 1;
                signExtendFlag = 0;
                break;
            case "ldsb":
                hFlag = 0;
                signExtendFlag = 1;
                break;
            case "ldsh":
                hFlag = 1;
                signExtendFlag = 1;
        }
        result |= (hFlag << 11);
        result |= (signExtendFlag << 10);

        // Offset register
        const offsetRegister = this.parseReg(tokens[3], lineNumber);
        if (isNaN(offsetRegister))
            return NaN;
        result |= (offsetRegister << 6);

        // Base register
        const baseRegister = this.parseReg(tokens[2], lineNumber);
        if (isNaN(baseRegister))
            return NaN;
        result |= (baseRegister << 3);

        // Destination register
        const destinationRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(destinationRegister))
            return NaN;
        result |= destinationRegister;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 8 (load/store halfword)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat10(lineNumber: number, tokens: string[]): number
    {
        let result = 0b1000000000000000;

        // Load/store bit
        let loadStoreBit = 0;
        if (tokens[0] == "ldrh")
        {
            loadStoreBit = 1;
        }
        result |= (loadStoreBit << 11);

        // Immediate value
        const immediate = this.parseImmediate(tokens[3], true, lineNumber, 5);

        result |= (immediate << 6);

        // Base register
        const baseRegister = this.parseReg(tokens[2], lineNumber);
        if (isNaN(baseRegister))
            return NaN;
        result |= (baseRegister << 3);

        // Destination register
        const destinationRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(destinationRegister))
            return NaN;
        result |= destinationRegister;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 9 (load/store with immediate offset)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat9(lineNumber: number, tokens: string[]): number
    {
        let result = 0b0110000000000000;

        // Flags
        let loadStoreFlag = 0;
        let byteWordFlag = 0;
        switch (tokens[0])
        {
            case "ldrb":
                loadStoreFlag = 1;
                byteWordFlag = 1;
                break;
            case "ldr":
                loadStoreFlag = 1;
                byteWordFlag = 0;
                break;
        }
        result |= (loadStoreFlag << 11);
        result |= (byteWordFlag << 12);

        // Immediate value
        const immediate = this.parseImmediate(tokens[3], true, lineNumber, 5)
        result |= (immediate << 6);

        // Base register
        const baseRegister = this.parseReg(tokens[2], lineNumber);
        if (isNaN(baseRegister))
            return NaN;
        result |= (baseRegister << 3);

        // Source/destination register
        const sourceDestinationRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(sourceDestinationRegister))
            return NaN;
        result |= sourceDestinationRegister;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 11 (SP-relative load/store)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat11(lineNumber: number, tokens: string[]): number
    {
        let result = 0b1001000000000000;

        // Load/store bit
        let loadStoreFlag = 0;
        if (tokens[0] == "ldr")
            loadStoreFlag = 1;
        result |= (loadStoreFlag << 11);

        // Destination register
        const destinationRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(destinationRegister))
            return NaN;
        result |= (destinationRegister << 8);

        // Immediate value
        const immediate = this.parseImmediate(tokens[3], true, lineNumber, 8);
        result |= immediate;

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

        // Immediate value (part 2)
        result |= (Math.abs(immediate));

        return result;
    }

    /**
     * Generates machine code for an instruction in format 15 (multiple load/store)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat15(lineNumber: number, tokens: string[])
    {
        let result = 0b1100000000000000;

        let loadStore = 0;
        if (tokens[0] == "stmia")
            loadStore = 0;
        if (tokens[0] == "ldmia")
            loadStore = 1;
        result |= (loadStore << 11);

        const baseRegister = this.parseReg(tokens[1], lineNumber);
        if (isNaN(baseRegister))
            return NaN;
        result |= (baseRegister << 8);

        let registerList = 0;
        for (let i = 2; i < tokens.length; i++)
        {
            registerList |= (1 << this.parseReg(tokens[i], lineNumber));
        }
        result |= registerList;

        return result;
    }

    /**
     * Generates machine code for an instruction in format 16 (conditional branch)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat16(lineNumber: number, tokens: string[], pc: number, labels: Map<string, number>, toFix: Map<string[], number>): number
    {
        let result = 0b1101000000000000;

        // Condition
        let condition = 0;
        switch (tokens[0])
        {
            case "beq":
                condition = 0b0000; break;
            case "bne":
                condition = 0b0001; break;
            case "bcs":
                condition = 0b0010; break;
            case "bcc":
                condition = 0b0011; break;
            case "bmi":
                condition = 0b0100; break;
            case "bpl":
                condition = 0b0101; break;
            case "bvs":
                condition = 0b0110; break;
            case "bvc":
                condition = 0b0111; break;
            case "bhi":
                condition = 0b1000; break;
            case "bls":
                condition = 0b1001; break;
            case "bge":
                condition = 0b1010; break;
            case "blt":
                condition = 0b1011; break;
            case "bgt":
                condition = 0b1100; break;
            case "ble":
                condition = 0b1101; break;
            default: return NaN;
        }
        result |= (condition << 8);

        // Immediate value
        if (labels.has(tokens[1]))
        {
            const offset = this.calcLabelOffset(tokens[1], pc, labels, 8, lineNumber);
            if (isNaN(offset))
                return NaN;

            return result | offset;
        }
        else
        {
            toFix.set(tokens, pc);
            return result;
        }
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
     * Generates machine code for an instruction in format 18 (unconditional branch)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat18(lineNumber: number, tokens: string[], pc: number, labels: Map<string, number>, toFix: Map<string[], number>): number
    {
        let result = 0b1110000000000000;

        // Immediate value
        if (labels.has(tokens[1]))
        {
            const offset = this.calcLabelOffset(tokens[1], pc, labels, 11, lineNumber);
            if (isNaN(offset))
                return NaN;

            return result | offset;
        }
        else
        {
            toFix.set(tokens, pc);
            return result;
        }
    }

    /**
     * Generates machine code for an instruction in format 19 (long branch with link)
     * @param {number} lineNumber
     * @param {string[]} tokens
     * @returns {number}
     */
    private asmFormat19(lineNumber: number, tokens: string[], pc: number, labels: Map<string, number>, toFix: Map<string[], number>): number[]
    {
        let highInstruction = 0b1111000000000000;
        let lowInstruction = 0b1111100000000000;

        // Immediate value
        if (labels.has(tokens[1]))
        {
            const offset = this.calcLabelOffset(tokens[1], pc, labels, 23, lineNumber);
            if (isNaN(offset))
                return [NaN];

            const highBits = (offset & 0b11111111111000000000000) >> 12;
            highInstruction |= highBits;

            const lowBits = (offset & 0b00000000000111111111111);
            lowInstruction |= lowBits;

            return [highInstruction, lowInstruction];
        }
        else
        {
            toFix.set(tokens, pc);
            return [highInstruction, lowInstruction];
        }
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

    /**
     * Tells whether the given token is an immediate value
     * @param {string} token
     * @returns {boolean}
     */
    private isImmediate(token: string): boolean
    {
        return (token[0] == "#");
    }
}
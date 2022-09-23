/**
 * parser.ts
 * 
 * Splits lines of source code into individual tokens, converts
 * tokenized source code into machine code. Also contains methods for
 * parsing tokens as any type of operand.
 */

import Assembler from "./assembler";
import ErrorBuilder from "./errorBuilder";
import FakeUI from "./fakeUI";

export default class Parser
{
    // instruction mnemonics mapped to opcodes
    static opcodeVals = new Map([
        // instructions
        ["add", 0x1000], ["and", 0x5000], ["br", 0x0E00], ["brn", 0x0800],
        ["brz", 0x0400], ["brp", 0x0200], ["brnz", 0x0C00], ["brnp", 0x0A00],
        ["brzp", 0x0600], ["brnzp", 0x0E00], ["jmp", 0xC000], ["jsr", 0x4800],
        ["jsrr", 0x4000], ["ld", 0x2000], ["ldi", 0xA000], ["ldr", 0x6000],
        ["lea", 0xE000], ["not", 0x903F], ["ret", 0xC1C0], ["rti", 0x8000],
        ["st", 0x3000], ["sti", 0xB000], ["str", 0x7000], ["trap", 0xF000],
        // trap aliases
        ["getc", 0xF020], ["halt", 0xF025], ["in", 0xF023],
        ["out", 0xF021], ["puts", 0xF022], ["putsp", 0xF024]
    ]);

    // instruction mnemonics mapped to their allowed length in bits of immediate operands
    static immBitCounts = new Map([
        ["add", 5], ["and", 5], ["br", 9], ["brn", 9], ["brz", 9], ["brp", 9],
        ["brnz", 9], ["brnp", 9], ["brzp", 9], ["brnzp", 9], ["jsr", 11], ["ld", 9],
        ["ldi", 9], ["ldr", 6], ["lea", 9], ["st", 9], ["sti", 9], ["str", 6]
    ]);
 
    /**
     * Trim leading and trailing whitespace and remove any comments
     * from a line of source code, convert to lowercase.
     * @param {string} line 
     * @returns {string}
     */
    static trimLine(line: string) : string
    {
        let res = line;
        const cmt = line.indexOf(';');
        if (cmt >= 0)
        {
            res = line.substring(0, cmt);
        }
        return res.trim().toLowerCase();
    }

    /**
     * Parse an immediate value, which can be decimal, binary or hexadecimal.
     * If it is not a valid value, return NaN.
     * @param {string} token 
     * @param {number} bits 
     * @returns {number}
     */
    static parseImmediate(token: string, bits = 16) : number
    {
        let mask = 0;
        for (let i = 0; i < bits; i++)
        {
            mask <<= 1;
            mask += 1;
        }

        let radix = 10;
        let start = 0;
        // it's optional to use '#' with 'x' or 'b'
        if (token[start] == '#')
        {
            ++start;
        }
        
        if (token[start] == 'x')
        {
            radix = 16;
            ++start;
        }
        else if (token[start] == 'b')
        {
            radix = 2;
            ++start;
        }
        const result = parseInt(token.substring(start), radix);
        const max = (1<<(bits-1))-1;
        const min = -(1<<(bits-1));
        if (isNaN(result))
        {
            FakeUI.print(Assembler.errors.IMMEDIATE + ": " + token);
            Assembler.hasError = true;
            return NaN;
        }
        else if (result < min || result > max)
        {
            FakeUI.print(Assembler.errors.IMMBOUNDS + ": " + token);
            Assembler.hasError = true;
            return NaN;
        }
        else
        {
            return result & mask;
        }
    }

    /**
     * Convert a string into a list of ascii codes
     * @param {string} literal 
     * @returns {number[]}
     */
    static stringToCodes(literal: string) : number[]
    {
        const result = [];
        let quote = literal[0];
        if ((quote == '"' || quote == "'") && literal[literal.length - 1] == quote)
        {
            for (let i = 1; i < literal.length - 1; i++)
            {
                result.push(literal.charCodeAt(i));
            }
            if (result.length == 0)
            {
                FakeUI.print(Assembler.errors.EMPTYSTRING);
                Assembler.hasError = true;
            }
        }
        else
        {
            FakeUI.print(Assembler.errors.BADQUOTES);
            Assembler.hasError = true;
        }
        return result;
    }

    /**
     * Parse a register operand, return the register number
     * @param {string} regStr 
     * @returns {number}
     */
    static parseReg(regStr: string) : number
    {
        if (regStr[0] != 'r' && regStr[0] != 'R')
        {
            FakeUI.print(Assembler.errors.BADREG);
            Assembler.hasError = true;
            return NaN;
        }
        else
        {
            const regNum = parseInt(regStr.substring(1));
            if (isNaN(regNum) || regNum < 0 || regNum >= 8)
            {
                FakeUI.print(Assembler.errors.BADREG);
                Assembler.hasError = true;
                return NaN;
            }
            else
            {
                return regNum;
            }
        }
    }
 
    /**
     * Calculate the difference between a label's address and the PC.
     * If the labels map does not contain the label, or the difference
     * does not fit in the given number of bits, return NaN.
     * Otherwise, return the value converted to unsigned and truncated
     * to the given number of bits.
     * This function requires the PC to be the location of the instruction
     * with the label operand, NOT incremented as it would be when adding
     * the offset to the PC during execution.
     * @param {string} label 
     * @param {number} pc 
     * @param {Map<string, number>} labels 
     * @param {number} bits 
     * @returns {number}
     */
    static calcLabelOffset(label: string, pc: number, labels: Map<string, number>, bits: number) : number
    {
        let mask = 0;
        for (let i = 0; i < bits; i++)
        {
            mask <<= 1;
            mask += 1;
        }
        if (labels.has(label))
        {
            // ts says diff may be undefined despite the above if statement
            // @ts-ignore
            const diff = labels.get(label) - (pc + 1);
            const max = (1<<(bits-1))-1;
            const min = -(1<<(bits-1));
            if (diff < min || diff > max)
            {
                FakeUI.print(Assembler.errors.LBLBOUNDS);
                Assembler.hasError = true;
                return NaN;
            }
            else
            {
                return diff & mask;
            }
        }
        else
        {
            FakeUI.print(Assembler.errors.BADLABEL);
            Assembler.hasError = true;
            return NaN;
        }
    }

    /**
     * Divide a line of source code into an array of token strings.
     * @param {string} line 
     * @returns {string[]}
     */
    static tokenizeLine(line: string) : string[]
    {
        /**
         * split on colons and commas
         * trim all resulting strings
         * split remaining non-empty strings on whitespace
         */
        const tokens = line.split(/[,:]/)
        for (let i = 0; i < tokens.length; i++)
        {
            tokens[i] = tokens[i].trim();
        }
        // if we have a line with just a label and colon, remove the empty token after the colon
        if (tokens.length == 2 && !tokens[1])
            tokens.pop();

        const result = [];
        for (let i = 0; i < tokens.length; i++)
        {
            const t = tokens[i].split(/[\s]+/);
            for (let j = 0; j < t.length; j++)
            {
                result.push(t[j]);
            }
        }
        return result;
    }

    /**
     * Convert a line of source code into machine code
     * @param {string[]} tokens 
     * @param {number} pc 
     * @param {Map<string, number>} labels 
     * @param {Map<string[], number>} toFix 
     * @returns {number}
     */
    // Given a tokenized line of source code; the location of the
    // instruction (given by pc); the known labels in the program; and
    // the map containing labels which have yet to be defined, return
    // the resulting machine code for that instruction. 
    static parseCode(tokens: string[], pc: number, labels: Map<string, number>, toFix: Map<string[], number>) : number
    {
        if (tokens[0].startsWith("br"))
            return this.asmBrJsr(tokens, pc, labels, toFix);
        switch (tokens[0])
        {
            case "add":
            case "and":
            case "not":
                return this.asmAluOp(tokens);
            case "jsr":
                return this.asmBrJsr(tokens, pc, labels, toFix);
            case "jmp":
            case "jsrr":
                return this.asmRegJump(tokens);
            case "ld":
            case "ldi":
            case "lea":
            case "st":
            case "sti":
                return this.asmPcLoadStore(tokens, pc, labels, toFix);
            case "ldr":
            case "str":
                return this.asmRegLoadStore(tokens);
            case "trap":
                return this.asmTrap(tokens[1]);
            case "getc":
            case "out":
            case "puts":
            case "in":
            case "putsp":
            case "halt":
                return this.asmTrapAlias(tokens[0]);
            case "ret":
                return 0b1100_0001_1100_0000;
            case "rti":
                return 0b1000_0000_0000_0000;
            default:
                return NaN;
        }
    }

    /**
     * generate machine code for an arithmetic operation (add, and, not)
     * @param {string[]} tokens
     * @returns {number}
     */
    static asmAluOp(tokens: string[]) : number
    {
        let res = this.opcodeVals.get(tokens[0]);
        // destination register
        // @ts-ignore
        res |= this.parseReg(tokens[1]) << 9;
        // source reg 1
        // @ts-ignore
        res |= this.parseReg(tokens[2]) << 6;

        // if doing NOT, we only need 2 registers
        if (tokens[0] != "not")
        {
            // try to treat last operand as a register
            let source2;
            if (tokens[3][0] == 'r' || tokens[3][0] == 'R')
                source2 = this.parseReg(tokens[3]);
            else
            {
                // set immediate flag
                // @ts-ignore
                res |= 0b10_0000;
                source2 = this.parseImmediate(tokens[3], this.immBitCounts.get(tokens[0]));
            }
            
            if (!isNaN(source2))
            {
                // @ts-ignore
                res |= source2;
            }
            else
            {
                return NaN;
            }
        }

        // @ts-ignore
        return res;
    }

    /**
     * generate machine code for a branch or subroutine call (control flow with PC offset)
     * @param {string[]} tokens 
     * @param {number} pc 
     * @param {Map<string, number>} labels 
     * @param {Map<string[], number>} toFix 
     * @returns {number}
     */
    static asmBrJsr(tokens: string[], pc: number, labels: Map<string, number>, toFix: Map<string[], number>) : number
    {
        let res = this.opcodeVals.get(tokens[0]);
        let bits = this.immBitCounts.get(tokens[0]);
        if (labels.has(tokens[1]))
        {
            // @ts-ignore
            return res | this.calcLabelOffset(tokens[1], pc, labels, bits);
        }
        else
        {
            toFix.set(tokens, pc);
            // @ts-ignore
            return res;
        }
    }

    /**
     * generate machine code for JMP or JSRR (control flow with a register)
     * @param {string[]} tokens 
     * @returns {number}
     */
    static asmRegJump(tokens: string[]) : number
    {
        let res = this.opcodeVals.get(tokens[0]);
        // @ts-ignore
        return (res | this.parseReg(tokens[1])) << 6;
    }

    /**
     * generate machine code for a load or store operation which uses a PC offset
     * @param {string[]} tokens 
     * @param {number} pc 
     * @param {Map<string, number>} labels 
     * @param {Map<string[], number>} toFix 
     * @returns {number}
     */
    static asmPcLoadStore(tokens: string[], pc: number, labels: Map<string, number>, toFix: Map<string[], number>) : number
    {
        let res = this.opcodeVals.get(tokens[0]);
        // @ts-ignore
        res |= this.parseReg(tokens[1]) << 9;
        if (labels.has(tokens[2]))
        {
            // @ts-ignore
            return res | this.calcLabelOffset(tokens[2], pc, labels, this.immBitCounts.get(tokens[0]));
        }
        else
        {
            toFix.set(tokens, pc);
            // @ts-ignore
            return res;
        }
    }

    /**
     * generate machine code for a load or store which uses a register + immediate offset
     * @param {string[]} tokens 
     * @returns {number}
     */
    static asmRegLoadStore(tokens: string[]) : number
    {
        let res = this.opcodeVals.get(tokens[0]);
        // @ts-ignore
        res |= this.parseReg(tokens[1]) << 9;
        // @ts-ignore
        res |= this.parseReg(tokens[2]) << 6;
        let imm = this.parseImmediate(tokens[3], this.immBitCounts.get(tokens[0]));
        if (isNaN(imm))
            return NaN;
        else
            // @ts-ignore
            return res | imm;
    }

    /**
     * generate machine code for a trap instruction
     * @param {string} code 
     * @returns {number}
     */
    static asmTrap(code: string) : number
    {
        let immCode = this.parseImmediate(code);
        if (isNaN(immCode) || immCode > 0xFF || immCode < 0)
            return NaN;
        else
            return 0xF000 | (immCode & 0xFF);
    }

    /**
     * generate machine code for a trap alias
     * @param {string} alias 
     * @returns {number}
     */
    static asmTrapAlias(alias: string) : number
    {
        // @ts-ignore
        return this.opcodeVals.get(alias);
    }
 
    /**
     * Given a tokenized line of source code with an assembler
     * directive, handle its effects and return the amount that
     * the program counter must be increased by after the operation.
     * If the directive is .end, return -1.
     * Assumes that the number of operands is valid.
     * @param {string[]} tokens 
     * @param {number} pc 
     * @param {number[]} memory 
     * @returns {number}
     */
    static parseDirective(tokens: string[], pc: number, memory: number[]) : number
    {
        let inc = 0;
        let val;
        switch (tokens[0])
        {
            case ".orig":
                FakeUI.print(Assembler.errors.MULTORIG);
                Assembler.hasError = true;
                break;

            case ".end":
                inc = -1;
                break;

            case ".fill":
                val = this.parseImmediate(tokens[1]);
                if (!isNaN(val))
                {
                    memory[pc] = val;
                    inc = 1;
                }
                break;

            case ".blkw":
                const amt = this.parseImmediate(tokens[1]);
                val = 0;
                if (tokens.length == 3)
                {
                    val = this.parseImmediate(tokens[2]);
                }
                if (!isNaN(val) && !isNaN(amt))
                {
                    for (let i = 0; i < amt; i++)
                    {
                        memory[pc++] = val;
                    }
                    inc = amt;
                }
                break;

            case ".stringz":
                const codes = this.stringToCodes(tokens[1]);
                if (codes != null && codes.length > 0)
                {
                    for (let i = 0; i < codes.length; i++)
                    {
                        memory[pc++] = codes[i];
                    }
                    inc = codes.length;
                }
                break;
        }

        return inc;
    }
}

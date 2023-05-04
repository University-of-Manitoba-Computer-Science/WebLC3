/**
 * armErrorBuilder.ts
 *
 * Much the same as errorBuilder.ts, but it uses ARM-specific operand counts.
 */

import ARMAssembler from "./armAssembler";
import ErrorBuilder from "./errorBuilder";

export default class ArmErrorBuilder extends ErrorBuilder
{
    /**
     * Wrong number of operands for an instruction or assembler directive
     * @param lineNum
     * @param tokens
     * @returns
     */
    public override operandCount(lineNum: number, tokens: string[]): string
    {
        let expected: string;
        if (tokens[0] == ".blkw")
        {
            expected = "1 or 2";
        }
        else if (!ARMAssembler.validMnemonic(tokens[0]))
        {
            return this.formatMessage(lineNum, "Assembler error: attempted to throw operand count error for unknown instruction/directive " + tokens[0]);
        }
        else
        {
            //@ts-ignore
            expected = ARMAssembler.operandCounts.get(tokens[0]);
        }
        return this.formatMessage(lineNum,
            "Incorrect number of operands for " + tokens[0] + ": expected " +
            expected + ", found " + (tokens.length-1));
    }
}
/**
 * armErrorBuilder.ts
 *
 * Generates additional error messages specific to ARM assembly
 */

import ErrorBuilder from "./errorBuilder";

export default class ArmErrorBuilder extends ErrorBuilder
{
    /**
     * The user (presumably) defined a label but didn't put a colon after its name
     */
    public labelMissingColon(lineNumber: number, label: string): string
    {
        return this.formatMessage(lineNumber, "Expected ':' after label definition");
    }
}
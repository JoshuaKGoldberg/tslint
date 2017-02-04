/**
 * @license
 * Copyright 2013 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as ts from "typescript";

import * as Lint from "../index";

const OPTION_NO_PADDING = "no-padding";
const OPTION_PADDING = "padding";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "object-literal-padding",
        description: "Enforces consistent whitespace padding inside object literals.",
        optionsDescription: Lint.Utils.dedent`
            One of the following arguments must be provided:
            
            * \`"${OPTION_NO_PADDING}"\` enforces not having a space inside brackets for object literals.
            * \`"${OPTION_PADDING}"\` enforces having padding inside object literals
            `,
        options: {
            type: "string",
            enum: [OPTION_NO_PADDING, OPTION_PADDING],
        },
        optionExamples: [`[true, "${OPTION_NO_PADDING}"]`, `[true, "${OPTION_PADDING}"]`],
        type: "style",
        typescriptOnly: false,
    };
    /* tslint:enable:object-literal-sort-keys */

    public static FAILURE_SHOULD_BE_PADDED = "Object literals should be padded with whitespace.";
    public static FAILURE_SHOULD_NOT_BE_PADDED = "Object literals should not be padded with whitespace.";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new ObjectLiteralPaddingWalker(sourceFile, this.getOptions()));
    }
}

class ObjectLiteralPaddingWalker extends Lint.RuleWalker {
    protected visitObjectLiteralExpression(node: ts.ObjectLiteralExpression) {
        const children = node.getChildren();
        const startingBracket = children[0];
        const firstMember = children[1];
        const lastMember = children[children.length - 2];
        const endingBracket = children[children.length - 1];

        this.checkTokenObject(startingBracket, firstMember.getStart() - startingBracket.getEnd());
        this.checkTokenObject(endingBracket, lastMember.getEnd() - endingBracket.getStart());

        super.visitObjectLiteralExpression(node);
    }

    private checkTokenObject(node: ts.Node, extraWidth: number) {
        if (extraWidth === 0) {
            if (this.hasOption(OPTION_PADDING)) {
                this.addFailureAt(node.getStart(), extraWidth + 1, Rule.FAILURE_SHOULD_BE_PADDED);
            }
        } else {
            if (this.hasOption(OPTION_NO_PADDING)) {
                this.addFailureAt(node.getStart(), extraWidth + 1, Rule.FAILURE_SHOULD_NOT_BE_PADDED);
            }
        }
    }
}

/**
 * @license
 * Copyright 2014 Palantir Technologies, Inc.
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

import { FixGenerators } from "./no-utf-assert/fixGenerators";
import { UtfToChaiMethods } from "./no-utf-assert/utfToChaiMethods";

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "no-utf-assert",
        description: "Converts UTF.Assert calls to their chai equivalents.",
        optionsDescription: "Not configurable.",
        options: null,
        optionExamples: ["true"],
        type: "functionality",
        typescriptOnly: true,
    };
    /* tslint:enable:object-literal-sort-keys */

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
    }
}

const utfAssertPrefix = "UTF.Assert.";

class Walker extends Lint.RuleWalker {
    protected visitCallExpression(node: ts.CallExpression) {
        super.visitCallExpression(node);

        const expressionText = node.expression.getText();
        if (expressionText.substring(0, utfAssertPrefix.length) !== utfAssertPrefix) {
            return;
        }

        const utfAssertion = expressionText.substring(utfAssertPrefix.length);

        this.addFailureAtNode(
            node,
            this.generateFailureString(expressionText, utfAssertion),
            this.generateFix(node, expressionText, utfAssertion));
    }

    private generateFailureString(expressionText: string, utfAssertion: string) {
        return `Use chai.assert.${UtfToChaiMethods[utfAssertion]} instead of ${expressionText}`;
    }

    private generateFix(node: ts.CallExpression, expressionText: string, utfAssertion: string) {
        if (FixGenerators[utfAssertion] === undefined) {
            return;
        }

        const start = node.getStart();
        const parameters = node.getChildren()[2].getChildren();
        const replacements = FixGenerators[utfAssertion](parameters, node);

        return this.createFix(
            Lint.Replacement.replaceFromTo(
                start,
                start + expressionText.length,
                `chai.assert.${UtfToChaiMethods[utfAssertion]}`),
            ...replacements);
    }
}

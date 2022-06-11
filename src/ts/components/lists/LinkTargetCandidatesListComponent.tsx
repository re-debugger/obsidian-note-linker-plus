import * as React from "react";
import {LinkMatch, LinkTargetCandidate} from "../../../../pkg";
import {LinkMatchTitleComponent} from "../titles/LinkMatchTitleComponent";
import {ReplacementsSelectionComponent} from "../selection/ReplacementsSelectionComponent";


interface noteLinkMatchResultTextMatchProps {
    linkMatch: LinkMatch
}

export const LinkTargetCandidatesListComponent = ({linkMatch}: noteLinkMatchResultTextMatchProps) => {

    return (
        <div>
            <LinkMatchTitleComponent matchedText={linkMatch.matched_text} position={linkMatch.position}/>
            <ul>
                {linkMatch.link_match_target_candidate.map((linkTargetCandidate: LinkTargetCandidate) => {
                    return (
                        <ReplacementsSelectionComponent
                            linkTargetCandidate={linkTargetCandidate}
                            textContext={linkMatch.context}
                            key={linkTargetCandidate.path + "match"}
                        />
                    )
                })}
            </ul>
        </div>

    );
};
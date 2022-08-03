import * as React from "react";
import * as Comlink from "comlink";

import {useContext, useEffect, useState} from "react";
import {
    LinkMatch, LinkTargetCandidate,
    Note,
    NoteChangeOperation,
    NoteMatchingResult,
    NoteScannedEvent,
    Replacement, SelectionItem
} from "../../../../pkg";
import JsNote from "../../JsNote";
import {AppContext, NoteFilesContext, SelectedNoteChangeOperations, WasmWorkerInstanceContext} from "../../context";
import Progress from "../../Progress";
import {ProgressComponent} from "../general/ProgressComponent";
import {NoteMatchingResultsList} from "../lists/NoteMatchingResultsListComponent";
import {TFile} from "obsidian";

enum MatchingState {
    Scanning,
    Selecting,
    Replacing,
    Finished
}

export const MatcherComponent = () => {

    const {vault, metadataCache, fileManager} = useContext(AppContext);
    const wasmWorkerInstance = useContext(WasmWorkerInstanceContext);

    const [matchingState, setMatchingState] = useState<MatchingState>(MatchingState.Scanning);
    const [numberOfLinkedNotes, setNumberOfLinkedNotes] = useState<number>(0);

    const [noteMatchingResults, setNoteMatchingResults] = useState<Array<NoteMatchingResult>>([]);
    const [linkMatchingProgress] = useState<Progress>(new Progress(JsNote.getNumberOfNotes(vault, metadataCache)));
    const [noteChangeOperations, setNoteChangeOperations] = useState<Map<string, NoteChangeOperation>>(new Map());

    const onLinkMatchingProgress = (noteScannedEvent: NoteScannedEvent) => {
        console.log("note scan event")
        linkMatchingProgress.increment();
        if (linkMatchingProgress.isComplete()) setMatchingState(MatchingState.Selecting)
    }

    const handleReplaceButtonClicked = () => {
        setMatchingState(MatchingState.Replacing);
        const operations: Array<Promise<void>> = [];
        noteChangeOperations.forEach((op : NoteChangeOperation) => {
            op.applyReplacements()
            const noteFile = noteFiles.get(op.path);
            operations.push(vault.modify(noteFile, op.content));
        })
        Promise.all(operations).then(() => {
            onDidLinkNotes(operations.length)
        })
    }

    const onDidLinkNotes = (num: number) => {
        setNumberOfLinkedNotes(num);
        setMatchingState(MatchingState.Finished)
    }

    const initNoteChangeOperations = (noteLinkMatchResults: Array<NoteMatchingResult>) => {
        const operations : Map<string, NoteChangeOperation> = new Map;
            noteLinkMatchResults.forEach((result: NoteMatchingResult) => {
            const path = result.note.path;
            const content = result.note.content;
            const replacements : Array<Replacement> = [];
            result.linkMatches.forEach((match: LinkMatch) => {
                match.linkMatchTargetCandidates.forEach((candidate: LinkTargetCandidate) => {
                    candidate.selectionItems.forEach((selection: SelectionItem) => {
                        if (selection.isSelected) {
                            replacements.push(
                                new Replacement(
                                    match.position,
                                    fileManager.generateMarkdownLink(
                                        noteFiles.get(candidate.path),
                                        result.note.path,
                                        null,
                                        selection.content == result.note.title
                                            ? null
                                            : selection.content
                                    ),
                                    selection.content,
                                    candidate.path
                                )
                            )
                            return;
                        }
                    })
                })
            })
            if (replacements.length > 0) operations.set(path, new NoteChangeOperation(
                path,
                content,
                replacements
            ))
        })
        setNoteChangeOperations(operations)
    }
    const initNoteFiles = () : Map<string, TFile> => {
        const noteFiles = new Map<string, TFile>();
        vault.getFiles().forEach((file: TFile) => noteFiles.set(file.path, file))
        return noteFiles
    }

    const [noteFiles] = useState<Map<string, TFile>>(initNoteFiles());

    useEffect(() => {
        JsNote.getNotesFromVault(vault, metadataCache)
            .then((jsNotes: JsNote[]) => {
                const noteStrings: Array<string> = jsNotes.map((jsNote: JsNote) => jsNote.toJSON());
                return wasmWorkerInstance.find(noteStrings, Comlink.proxy(onLinkMatchingProgress));
            })
            .then((serializedNoteLinkMatchResults: Array<string>) => {
                const noteLinkMatchResults : Array<NoteMatchingResult> = serializedNoteLinkMatchResults.map((noteLinkMatchResult: string) => NoteMatchingResult.fromJSON(noteLinkMatchResult));
                console.log(noteLinkMatchResults);
                setNoteMatchingResults(noteLinkMatchResults)
                initNoteChangeOperations(noteLinkMatchResults);
            })
        return () => {
            // On unmount
        }
    }, [wasmWorkerInstance]);
        if (matchingState == MatchingState.Scanning) return <ProgressComponent progress={linkMatchingProgress}/>
        else if (matchingState == MatchingState.Selecting) return (
            <NoteFilesContext.Provider value={noteFiles}>
                <SelectedNoteChangeOperations.Provider value={{noteChangeOperations, setNoteChangeOperations}}>
                    <NoteMatchingResultsList noteMatchingResults={noteMatchingResults}
                                             onClickReplaceButton={handleReplaceButtonClicked}
                    />
                    <div>
                        {noteChangeOperations.size}
                    </div>
                </SelectedNoteChangeOperations.Provider>
            </NoteFilesContext.Provider>
        )
        else if (matchingState == MatchingState.Replacing) return <div className={"info-toast"}>⏳ Linking Notes...</div>
        else return <div className={"success-toast"}>🎉 Successfully linked {numberOfLinkedNotes} notes!</div>
};


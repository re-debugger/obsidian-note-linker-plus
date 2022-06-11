use std::borrow::Cow;
use std::ops::Add;
use std::thread::Builder;
use fancy_regex::{escape, Match, Regex};
use crate::log;

use crate::rs::matching::link_match::LinkMatch;
use crate::rs::matching::link_matching_result::LinkMatchingResult;
use crate::rs::note::note::Note;
use crate::rs::util::range::Range;

type LinkMatcher = Regex;

pub struct RegexMatch {
    pub position: Range,
    pub matched_text: String
}

impl RegexMatch {
    pub fn new_from_match (m: Match) -> Self {
        RegexMatch {
            position: Range::new_with_usize(m.start(), m.end()),
            matched_text: m.as_str().to_string()
        }
    }
}

struct LinkMatcherResult <'m> {
    regex_matches: Vec<RegexMatch>,
    note: &'m Note,
    target_note: &'m Note,
}

impl <'m> LinkMatcherResult <'m> {
    fn new(note: &'m Note, target_note: &'m Note) -> Self {
        let regex_matches: Vec<RegexMatch> = get_link_matcher(&target_note)
            .find_iter(&note.content())
            .filter_map(|match_result| { match_result.ok() })
            .map(|m: Match| RegexMatch::new_from_match(m))
            .collect();

        LinkMatcherResult {
            regex_matches,
            note,
            target_note,
        }
    }

    /*fn has_matches(&self) -> bool {
        &self.regex_matches.count() > &0
    }*/
}

impl <'m> Into<Vec<LinkMatch>> for LinkMatcherResult <'m> {
    fn into(self) -> Vec<LinkMatch> {
        let note: &Note = self.note;
        let target_note: &Note = self.target_note;
        let text_link_matches: Vec<LinkMatch> = self.regex_matches
            .into_iter()
            .map(|regex_match: RegexMatch| {
                LinkMatch::new_from_match(&regex_match, note, target_note)
            })
            .collect();
        text_link_matches
    }
}

fn concat_as_regex_string (strings: &Vec<String>) -> String {
    strings.iter()
        .enumerate()
        .fold("(".to_string(), |prev, (index, current)| {
            return if index == 0 { format!("{}{}", prev, current) } else { format!("{}|{}", prev, current) }
        })
        .add(")")
}

fn get_link_matcher(note: &Note) -> LinkMatcher {
    let mut escaped_search_strings: Vec<String> = note.aliases_vec().iter().map(|alias| escape(alias).to_string()).collect();
    let escaped_title = escape(&*note.title()).to_string();
    escaped_search_strings.push(escaped_title);

    let regex_string = concat_as_regex_string(&escaped_search_strings);
    Regex::new(&*format!(r"\b{}\b", regex_string)).unwrap()
}

pub fn get_link_matches(note_to_check: &Note, target_note_candidates: &[Note]) -> Option<LinkMatchingResult> {
    let text_link_matches: Vec<LinkMatch> =
        target_note_candidates
        .iter()
        .filter_map(|target_note: &Note| {
            if !&target_note.title().eq(&note_to_check.title()) {
                return Some(
                    LinkMatcherResult::new(
                        note_to_check,
                        target_note
                    )
                )
            }
            None
        })
        .map(
            |link_matcher_result: LinkMatcherResult| {
                // TODO: is there a mapping function for casting?
                let text_link_match: Vec<LinkMatch> = link_matcher_result.into();
                text_link_match
            }
        )
        .flatten()
        .collect();
    if *&!text_link_matches.is_empty() {
        return Some(
            LinkMatchingResult::new(
                note_to_check.clone(),
                text_link_matches
            )
        )
    }
    None
}
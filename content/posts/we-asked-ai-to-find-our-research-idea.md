+++
title = "We asked AI to find our research idea from day one. It found it once in ten tries."
date = 2026-11-17T22:00:00Z
draft = false
description = "A replay of one project's first day: could AI question-askers, a field map or a pool of models find the idea we published?"
tags = ["agents", "llm", "research"]
categories = ["research"]
+++

_By Swapnil Sharma, 17 November 2026_

We gave an AI the plan we wrote on the first day of a project and let it hunt for the idea our paper ended up with. In ten games it got there once, on its very last guess. Extra helpers did not change that much. The problem was hard because the idea needed the question itself to change.

## The game

The setup copies a recent paper, [Re-Search](https://arxiv.org/abs/2611.14487). Re-Search argues that the hard part of research is asking the right questions.

A model plays detective. It may ask 60 yes/no questions about a hidden target, and after every 10 it writes down its best guess at the idea. A second model holds the target and answers each question. Two more models score each guess from 0 to 10. A 5 means the right area with the wrong mechanism. An 8 means the guess names the key mechanism.

Our target was one of our own projects. Its day-one plan was about how AI judges rate art. The paper we finished weeks later was about something else, a confound we only found by running experiments. (It is under blind review, so we keep it vague here.)

## Five ways to play

We tried five setups, two games each:

- Solo: one model asks every question.
- Map: before the game, the model reads a short survey of the field, written without knowing the answer.
- Pool: three different models each propose a next question, and the main model picks one.
- Map plus pool.
- Same-model pool: three separate calls to the same model propose questions.

Re-Search found that both a field survey and a pool of models help. We wanted to know whether they would have helped us.

## What happened

No setup reliably found the idea. Average final scores sat between 4.5 and 5 for four setups. The three-model pool averaged 6.8, but that rests on a single game that reached 8 on its last guess.

Even that win is weak evidence for mixing models. The questions that cracked it all came from one model, the same one that played the solo games. The pools also cost about twice as much per game.

The map did nothing. That fits Re-Search too. A map helps when it points near the answer. Ours, written as we could have written it on day one, covered art and nothing near where the paper ended up. It pointed the wrong way.

## The real wall

The detectives failed for one reason. The day-one plan was about art, and the answer was about a different kind of image. Eight of ten games never learned that. They stayed on art and settled on an answer the judges scored 5: right area, wrong mechanism.

The one game that won asked, at question 20, whether the paper was about a different domain. It got a yes and followed it.

So the hardest step was dropping the starting frame. A wider pool of question-askers did not fix that, and neither did a better map of the starting field.

## What we changed

We had spent our early effort polishing the day-one plan. It went through dozens of review rounds in a few days, almost all small fixes, on a frame we later dropped. The idea came from running experiments and looking at what came back.

So we now keep a notebook of things we can't explain: odd outputs, results that should not happen, methods failing where they should work. Before ranking ideas, we look at about 30 raw examples ourselves. We dropped plans to add model pools or field maps to our idea step.

This was one project and ten games, and the whole test cost under $9. A field map that did point the right way might help. We did not test that.

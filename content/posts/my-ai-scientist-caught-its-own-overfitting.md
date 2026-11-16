+++
title = "My AI scientist caught its own overfitting"
date = 2026-11-16T01:30:00Z
draft = false
description = "An AI scientist that improves a GPU price forecaster, tests each change, and knew when to keep the old model."
tags = ["agents", "llm", "forecasting"]
categories = ["research"]
images = ["/gpu-scientist/framework-v8.png"]
+++

_By Swapnil Sharma, 16 November 2026_

I built an AI scientist that improves a GPU price forecaster.
It tests each change, keeps the ones that hold up, and can decide to keep the old model.
I made it at the Iterate AI Research hackathon in San Francisco, Pacific track, on 14 and 15 November 2026.

{{< youtube SzSlT4WRufI >}}

## The forecaster

Posted GPU rental prices move in steps.
On most days tomorrow's price equals today's, so the forecaster starts its middle guess at the latest price.
Around that guess it sets a low and a high, built from how often and how far similar sellers have repriced before.
It forecasts 1, 3 and 7 days ahead.

Skill is the gain over the simplest guess, "tomorrow's price equals today's".
A skill of 0 means no better than that guess.

## The loop

![The v8 loop: price data feeds 3 AI researchers, who edit the forecaster. A locked judge backtests each change and keeps or reverts it. Every result goes to a shared notebook, which a director reads to rewrite the plan every hour. The best keep is scored once on sealed October data.](/gpu-scientist/framework-v8.png)

The loop has four parts.

1. The forecaster: the code that predicts prices.
2. Three AI researchers. Each one edits the forecaster in its own sandbox and tries one change at a time.
3. A locked judge. It backtests every change and keeps or reverts it. The researchers can't edit the judge or the scoring rules.
4. A director. Every hour it reads the whole experiment history and rewrites the plan: which idea comes next, who tries it, and which ideas to drop.

A change stays only if it raises September skill by at least 0.003, costs at most 0.005 on July to September, and wins at least 60% of resampling tests.
Near-ties go to the simpler code.
October stays sealed as the final test, and it is scored once.

## v7: one real win

The first version, v7, let the agents tune seven settings.
One change mattered: learning more from similar sellers.
Most other changes moved skill by less than 0.001.

On October, v7 scored +0.149 skill against +0.122 for the starter forecaster.
Its range held the real price 71% of the time.
v7 is the model I submitted.

## v8: better on practice data, worse on new data

In v8 the researchers rewrote the forecaster's code and built a long chain of changes.
They ran 144 experiments and kept 57.
September skill rose from +0.185 to +0.333.

Then October opened.
v8 scored +0.069 against v7's +0.149.
It had chased recent price trends too hard.
That paid in September, but October's prices moved more often.
v8 had overfit to the months it practiced on.
I wrote the pick rule down before opening October and ran October once, so this loss is real.

## The heal, and v8.1

After v8 lost, a fresh director read the failure and proposed three new checks:

- reject forecasts that move outside the old model's range;
- reject changes that hurt any one price series too much;
- reject changes that do badly on the most recent days.

On a replay, all three checks reject the v8 pick and pass v7.
The loop now starts this heal by itself when a pick loses.

v8.1 is the round built under those checks.
On held-out late October it scored +0.123 against v7's +0.109.
The 95% interval for that gap runs from −0.027 to +0.053, so v8.1 is no longer worse and not shown better.
That evidence is weak, because I had seen October while setting v8.1 up.
v7 stays submitted.

## What's next

Two more rounds ran.
v8.2 kept nothing.
v8.3 found a gain on development data, and no unseen week was left to test it on.
November's prices will be its first real test.

## What I learned

The most useful thing this loop did was say "keep v7".
A loop that climbs on its own practice data will find ways to fool itself.
A locked judge, a sealed month and checks written after a failure let this one catch that.

[Demo video](https://youtu.be/SzSlT4WRufI) · [Slides (PDF)](https://github.com/swappysh/gpu-scientist/blob/main/docs/step-function-deck-v5.pdf) · [Code](https://github.com/swappysh/gpu-scientist)

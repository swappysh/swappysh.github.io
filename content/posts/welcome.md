+++
title = "Hello, World"
date = 2026-02-25T00:00:00Z
draft = false
description = "Why I'm starting this blog and what to expect."
tags = ["meta"]
categories = ["site"]
+++

I've spent the last few years building production AI systems — multi-agent architectures, LLM evaluation pipelines, safety-critical patient conversation platforms, code generation tools. A lot of that work happened in fast-moving startups where the goal was to ship, not to document.

This blog is an attempt to fix that.

## What I'll write about

Most of what I'll cover sits at the intersection of **research and production engineering** — the gap that doesn't get enough attention. Things like:

- What actually breaks when you take a multi-agent system from prototype to 1M+ calls per week
- How to build LLM-as-a-judge pipelines that you can actually trust
- The practical tradeoffs in RAG, tool-calling, and fine-tuning when the stakes are real
- Lessons from building evaluation infrastructure that surfaces signal, not noise

I'm less interested in "here's how to call the OpenAI API" tutorials and more interested in the decisions that determine whether a system is reliable, debuggable, and worth deploying.

## Background

I'm currently a Senior Research Engineer at Aleph, building a semi-autonomous FP&A agent for finance teams. Before that I was part of the founding team at HippocraticAI, where I worked on Polaris — a multi-agent system for safety-critical patient conversations.

Earlier work includes code generation research at Microsoft, biomedical NLP at Nference, and payments infrastructure at Zeta. I did my MS in CS at NYU, where my research focused on code generation and bias evaluation in LLMs.

The through-line across all of it: systems that need to work when it matters.

## Format

Posts will mostly be technical. Some will be long-form deep dives, some will be shorter notes on a specific problem or pattern I found interesting. No fixed cadence — I'll write when I have something worth saying.

If something resonates or you want to push back on something, reach out.

# Product Documentation

## 1. Overview

This project aims to build and maintain a personal portfolio website for Swapnil Sharma. The website serves as a central online presence to showcase professional experience, provide contact information (social links, email), share an 'About Me' section, and offer a downloadable resume. It utilizes the Hugo static site generator and the 'hello-friend-ng' theme. The target audience includes potential employers, collaborators, and professional contacts.

## 2. Tasks

- [x] **Task 1: Initial Project Setup:** Configure Hugo, select and install the theme ('hello-friend-ng').
- [x] **Task 2: Core Content Creation:** Create the 'About Me' page and add the resume PDF.
- [x] **Task 3: Site Configuration:** Set up site parameters in `config.toml` (title, subtitle, social links, menu, profile image).
- [x] **Task 4: Deployment Setup:** Configure the build process and deployment workflow (GitHub Actions) for GitHub Pages.
- [ ] **Task 5: Ongoing Maintenance:** Update the resume file, potentially update the theme, or add new content sections (e.g., blog, projects) if desired later.
- [x] **Task 6: Fix Build Workflow:** Resolve Hugo build errors caused by theme updates and SCSS processing changes.
- [x] **Task 7: Add Repository README:** Create a `README.md` file explaining the project structure, development, and deployment process.

## 3. User Stories

### Task 1 Stories

- **Story 1.1:** As the site owner (Swapnil), I want to initialize a Hugo project so that I have the basic structure for my website.
- **Story 1.2:** As the site owner, I want to select and install the 'hello-friend-ng' theme so that my website has a consistent and appealing visual design.

### Task 2 Stories

- **Story 2.1:** As the site owner, I want to create an 'About Me' page with relevant personal and professional information so that visitors can learn more about me.
- **Story 2.2:** As the site owner, I want to add my resume PDF (`Swapnil_Sharma_ML.pdf`) to the site's static assets so that it can be linked and downloaded.

### Task 3 Stories

- **Story 3.1:** As the site owner, I want to configure the main site title ("Swapnil Sharma") and subtitle ("Experienced Computer Scientist") in `config.toml` so that the site identity is clearly displayed.
- **Story 3.2:** As the site owner, I want to add my social media links (GitHub, LinkedIn, Twitter, email) to `config.toml` so that visitors can easily connect with me.
- **Story 3.3:** As the site owner, I want to define the main navigation menu ('About Me', 'Resume') in `config.toml` so that visitors can easily navigate the site's core sections.
- **Story 3.4:** As the site owner, I want to link my profile picture (`profile.png`) in `config.toml` so that it appears visually on the site.
- **Story 3.5:** As the site owner, I want to link my resume PDF (`Swapnil_Sharma_ML.pdf`) in the `config.toml` menu so that visitors can find and download it directly from the navigation.

### Task 4 Stories

- **Story 4.1:** As the site owner, I want to configure the Hugo build process to output the final website files into the `docs/` directory so that it aligns with GitHub Pages requirements for serving from the `docs/` folder.
- **Story 4.2:** As the site owner, I want to configure the GitHub repository settings to serve the website content from the `docs/` directory on the main branch so that the site is publicly accessible via the `swappysh.github.io` URL.
- **Story 4.3:** As the site owner, I want a mechanism (like a GitHub Actions workflow) to automatically build and deploy the site upon pushing changes so that updates are reflected online efficiently.

## 4. Future Considerations / Roadmap

- Adding a blog section for articles or updates.
- Creating a dedicated 'Projects' page to showcase work samples.
- Integrating a contact form.
- Updating the theme or customizing its appearance further.
- Improving SEO (Search Engine Optimization).

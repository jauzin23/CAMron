# Contributing to CAMron

Thanks for wanting to contribute. Whether it's a bug fix, a new feature, or support for a new board, contributions are welcome.

## Before you start

Get the project running locally first (see [Getting Started](README.md#getting-started) in the README).

## Two kinds of contributions

CAMron has two parts that are tested differently:

- **Frontend / dashboard changes** (UI, camera management, flashing flow): no hardware required, you can develop and test entirely in the browser.
- **Backend / firmware changes** (compilation pipeline, config generation, C++ template): ideally tested with a **real** ESP32-CAM. If you don't have it, it's fine, just say so in your PR so it gets tested before merging.

## How to contribute

1. **Every PR must come from an assigned issue.** Open an issue first (or comment on an existing one) and get it assigned to you before starting work.
2. **Fork and branch.** Branch off `main`, named `issue-number-short-description`, e.g. `12-serial-port-detection-fix`.
3. **Keep PRs focused.** One fix or feature per PR. Avoid bundling unrelated changes.
4. **Avoid unnecessary dependencies.** If a change can be done without adding a new package, prefer that (unless it requires you to reinvent the wheel).
5. **Test before submitting:** Self explanatory. Even thought in each PR we already run the tests automatically, make sure u run it beforehand, to fix any problems early on.
6. **Open the PR against `main`**, follow the template.

## Code of Conduct

Be respectful.

## License

By contributing, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).

Thanks for **helping** improve **CAMron**.

# CCSorcerer
CCSorcerer is a tool for downloading ClassCharts' client app.
It will also be used in GitHub Actions to automatically download the latest version of the client app, then publish a release when new changes are detected. This will be ran every week.

## Usage

### Download .exe for Windows
Download the latest `.exe` from a build artifact found [here][actions].

### Manually run for Linux, macOS or Windows
Clone the repo, using git or downloading the zip. Then, run the following command:
```bash
deno run start
```
Don't have `deno`? Check out the [requirements](#requirements) section.

## Compile for Windows
To compile the project for **Windows x86/x64**, run the following command:
```bash
deno run windows
```
It will output an `.exe` file in the main directory.

**Note:** Not sure if this works properly. Can someone please test and PR to remove this note?

## Requirements
- Deno 2.0.0 or newer ([download instructions][deno_install])
- Linux, macOS or Windows

[deno_install]: https://docs.deno.com/runtime/#install-deno
[actions]: https://github.com/CommunityCharts/CCSorcerer/actions/workflows/deno.yml

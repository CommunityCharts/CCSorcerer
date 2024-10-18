// deno-lint-ignore-file no-empty
import { SourceMapConsumer } from "npm:source-map";
import { existsSync } from "jsr:@std/fs";

const encoder = new TextEncoder();

// Download the source map and minified file using axios
function cleanDir() {
	console.log("Cleaning directory...");
	if (existsSync(Deno.cwd() + "/files")) {
		const files = Deno.readDirSync(Deno.cwd() + "/files");
		for (const file of files) {
			if (file.name === ".git") {
				continue;
			}

			Deno.removeSync(Deno.cwd() + "/files/" + file.name, { recursive: true });
		}
	}

	console.log("Cleaned.\nCreating files directory...");
	if (!existsSync(Deno.cwd() + "/files")) {
		Deno.mkdirSync(Deno.cwd() + "/files");
	}
}

async function getScriptName() {
	try {
		const response = await fetch(
			"https://classcharts.com/mobile/student",
			{
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
				},
			},
		);
		const data = await response.text();
		// Get value of last script tag href
		return data
			.match(/<script src="(.*)"><\/script>/g)!
			.pop()!
			.match(/src="(.*)"/g)!
			.pop()!
			.replace(/src="/g, "")
			.replace(/"/g, "");
	} catch {
		throw new Error("Error getting script name");
	}
}

async function getMinified(scriptName: string) {
	try {
		console.log("Getting minified script...");
		const response = await fetch(scriptName, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
			},
		});

		console.log("Got minified script");
		return await response.text();
	} catch {
		throw new Error("Error getting minified script");
	}
}

function getSourceMapName(minifiedScriptContents: string) {
	return minifiedScriptContents
		.match(/sourceMappingURL=(.*)/g)!
		.pop()!
		.replace("sourceMappingURL=", "");
}

async function getSourceMap(scriptName: string) {
	try {
		console.log("Getting source map...");
		const response = await fetch(
			"https://classcharts.com/build/" + scriptName,
			{
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
				},
			},
		);

		console.log("Got source map");
		return await response.text();
	} catch {
		console.log("Error getting source map");
		return null;
	}
}

async function downloadAndSaveLocale() {
	try {
		console.log("Getting locale...");
		const url =
			"https://www.classcharts.com/mobile/locales/en_gb/translation.json";
		const response = await fetch(url, {
			headers: {
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/87.0.4280.88 Safari/537.36",
			},
		});
		const data = await response.json();

		console.log("Got locale\nWriting to disk...");

		await Deno.writeFile(
			Deno.cwd() + "/files/translation.json",
			encoder.encode(JSON.stringify(data)),
		);

		console.log("Wrote locale to disk");

		return data;
	} catch {
		console.log("Error getting locale");
		return null;
	}
}

async function writeFiles(originalFiles: Record<string, string>) {
	// Write the original files to disk
	for (let [filename, contents] of Object.entries(originalFiles)) {
		// filename = filename.replace(/[^a-zA-Z0-9]/g, "_");
		filename = filename.replace("webpack://", "");
		// Replace "^", "*", ":", "?", "\"", "<", ">", "|", "/", and whitespace with an underscore
		// Replace directory containing only underscores with a single underscore
		// Don't write node_modules, or webpack files
		if (filename.includes("node_modules") || filename.includes("webpack")) {
			console.log("Skipping file: " + filename);
			continue;
		}
		// filename = filename.replace(/\/_+\/|node_modules/g, "_");
		// Recursively create the directory if it doesn't exist
		const dirs = filename.split("/");
		let dir = Deno.cwd() + "/files";
		for (let i = 0; i < dirs.length - 1; i++) {
			dir += "/" + dirs[i];
			if (!existsSync(dir)) {
				Deno.mkdirSync(dir);
			}
		}
		try {
			await Deno.writeFile(
				Deno.cwd() + "/files/" + filename,
				encoder.encode(contents as string),
			);
		} catch {
			console.log("Error writing file: " + filename);
		}
	}
}

if (import.meta.main) {
	console.log("Starting job...");

	cleanDir();
	const scriptName = await getScriptName();
	const minifiedScriptContents = await getMinified(scriptName);
	const sourceMapName = getSourceMapName(minifiedScriptContents);
	const sourceMapContents = await getSourceMap(sourceMapName);

	// Write minified file to disk
	if (minifiedScriptContents === null) {
		console.log("Minified script contents is null");
		Deno.exit(1);
	}
	Deno.writeFileSync(
		Deno.cwd() + "/files/minified.js",
		encoder.encode(minifiedScriptContents),
	);

	// Write source map to disk
	if (sourceMapContents === null) {
		console.log("Source map contents is null");
		Deno.exit(1);
	}

	Deno.writeFileSync(
		Deno.cwd() + "/files/sourceMap.js",
		encoder.encode(JSON.stringify(sourceMapContents)),
	);
	await downloadAndSaveLocale();

	if (sourceMapContents === null) {
		console.log("Source map contents is null");
		Deno.exit(1);
	}

	const originalSources: Set<string> = new Set();
	const originalFiles: Record<string, string> = {};
	try {
		await SourceMapConsumer.with(
			sourceMapContents,
			null,
			(consumer) => {
				try {
					consumer.eachMapping(function (m) {
						// console.log(m);
						originalSources.add(m.source);
					});
				} catch {
				}

				for (const source of originalSources) {
					try {
						originalFiles[source] = consumer.sourceContentFor(source)!;
					} catch {
					}
				}
			},
		);
	} catch {
	}

	await writeFiles(originalFiles);
	console.log("Job done.");
}

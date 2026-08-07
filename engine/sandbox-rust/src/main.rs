use std::io::{self, Read};
use std::process::{Command, Stdio};
use std::time::{Duration, Instant};

fn main() {
    let mut language = String::from("javascript");
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--language" | "-l" => {
                if let Some(v) = args.next() {
                    language = v.to_lowercase();
                }
            }
            "--help" | "-h" => {
                eprintln!("aether-sandbox --language <python|javascript>");
                eprintln!("Reads source code from stdin.");
                std::process::exit(0);
            }
            other => {
                eprintln!("unknown arg: {other}");
                std::process::exit(2);
            }
        }
    }

    let mut code = String::new();
    if let Err(err) = io::stdin().read_to_string(&mut code) {
        eprintln!("failed to read stdin: {err}");
        std::process::exit(2);
    }
    if code.trim().is_empty() {
        eprintln!("Code is empty");
        std::process::exit(2);
    }

    let dir = tempfile_dir();
    let (bin, _file, argv) = match language.as_str() {
        "python" => {
            let path = format!("{dir}/main.py");
            std::fs::write(&path, &code).expect("write");
            ("python3", path.clone(), vec![path])
        }
        "javascript" | "js" | "node" => {
            let path = format!("{dir}/main.js");
            std::fs::write(&path, &code).expect("write");
            ("node", path.clone(), vec![path])
        }
        other => {
            eprintln!("unsupported language: {other}");
            let _ = std::fs::remove_dir_all(&dir);
            std::process::exit(2);
        }
    };

    let stdin_data = std::env::var("AETHER_STDIN").unwrap_or_default();
    let started = Instant::now();
    let timeout = Duration::from_secs(10);

    let mut child = Command::new(bin)
        .args(&argv)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap_or_else(|err| {
            eprintln!("failed to spawn {bin}: {err}");
            let _ = std::fs::remove_dir_all(&dir);
            std::process::exit(127);
        });

    if let Some(mut sin) = child.stdin.take() {
        use std::io::Write;
        let _ = sin.write_all(stdin_data.as_bytes());
    }

    loop {
        match child.try_wait() {
            Ok(Some(status)) => {
                let stdout = read_pipe(child.stdout.take());
                let stderr = read_pipe(child.stderr.take());
                print!("{stdout}");
                eprint!("{stderr}");
                let _ = std::fs::remove_dir_all(&dir);
                std::process::exit(status.code().unwrap_or(1));
            }
            Ok(None) => {
                if started.elapsed() > timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    eprintln!("aether-sandbox: timed out");
                    let _ = std::fs::remove_dir_all(&dir);
                    std::process::exit(124);
                }
                std::thread::sleep(Duration::from_millis(20));
            }
            Err(err) => {
                eprintln!("wait error: {err}");
                let _ = std::fs::remove_dir_all(&dir);
                std::process::exit(1);
            }
        }
    }
}

fn read_pipe(pipe: Option<impl Read>) -> String {
    let mut out = String::new();
    if let Some(mut p) = pipe {
        let _ = p.read_to_string(&mut out);
    }
    out
}

fn tempfile_dir() -> String {
    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    let dir = std::env::temp_dir().join(format!("aether-sandbox-{stamp}"));
    std::fs::create_dir_all(&dir).expect("tmpdir");
    dir.to_string_lossy().into_owned()
}

#!/usr/bin/env python3
"""
Directory Tree Generator - Optimized for React Native/Expo Projects
Generates a clean visual tree structure focusing on source code and important files
"""

import os
from pathlib import Path
from typing import Set, List


class TreeGenerator:
    # Enhanced configuration for React Native/Expo projects
    DEFAULT_CONFIG = {
        'exclude_dirs': [
            # Dependencies
            'node_modules', 'vendor',

            # Build outputs
            'dist', 'build', '.expo', 'android/app/build',
            'android/.gradle', 'android/.kotlin', 'android/app/.cxx',
            'ios/build', 'ios/Pods',

            # Cache and temp
            '__pycache__', '.pytest_cache', '.mypy_cache',
            '.next', 'coverage', 'temp-apk',

            # IDE and system
            '.git', '.vscode', '.idea', '.DS_Store',
            'venv', 'env',

            # Android/Gradle specific
            '.gradle', '.cxx', 'build',

            # Expo/React Native specific
            '.expo-shared', 'web-build',
        ],
        'exclude_files': [
            # System files
            '.DS_Store', 'Thumbs.db', 'desktop.ini',

            # Lock files
            'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',

            # Environment and secrets
            '.env', '.env.local', '.env.production',
            'google-services.json', 'GoogleService-Info.plist',

            # IDE files
            '.gitignore', '.eslintcache',

            # Build artifacts
            'debug.keystore',

            # Gradle wrappers
            'gradle-wrapper.jar', 'gradlew', 'gradlew.bat',
        ],
        'exclude_patterns': [
            # Compiled files
            '.pyc', '.pyo', '.class', '.o',

            # Logs
            '.log',

            # Archives
            '.zip', '.tar', '.gz', '.apk', '.ipa', '.aab',

            # Build artifacts
            '.bin', '.lock', '.probe',

            # Images (optional - uncomment if you want to exclude)
            # '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',

            # Android specific
            '.so', '.dex',
        ],
        'include_extensions': None,  # None = include all
        'max_depth': None,  # None = unlimited

        # Additional patterns to exclude (matched against full path)
        'exclude_path_patterns': [
            'android/app/.cxx',
            'android/.gradle',
            'android/app/build',
            '.expo/web/cache',
            'android/gradle/wrapper',
        ]
    }

    def __init__(self, config: dict = None):
        """Initialize with configuration"""
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}
        self.exclude_dirs = set(self.config['exclude_dirs'])
        self.exclude_files = set(self.config['exclude_files'])
        self.exclude_patterns = self.config['exclude_patterns']
        self.exclude_path_patterns = self.config['exclude_path_patterns']
        self.include_extensions = self.config['include_extensions']
        self.max_depth = self.config['max_depth']

    def _should_exclude_by_path(self, path: Path, root: Path) -> bool:
        """Check if path should be excluded based on full path patterns"""
        try:
            relative_path = path.relative_to(root)
            path_str = str(relative_path).replace('\\', '/')

            for pattern in self.exclude_path_patterns:
                if pattern in path_str:
                    return True
        except ValueError:
            pass

        return False

    def _should_exclude(self, path: Path, root: Path = None) -> bool:
        """Check if path should be excluded"""
        # Check path patterns first (if root is provided)
        if root and self._should_exclude_by_path(path, root):
            return True

        if path.is_dir():
            return path.name in self.exclude_dirs
        else:
            # Check exact filename match
            if path.name in self.exclude_files:
                return True

            # Check pattern match
            for pattern in self.exclude_patterns:
                if path.name.endswith(pattern):
                    return True

            # Check extension filter
            if self.include_extensions:
                return path.suffix not in self.include_extensions

        return False

    def generate_tree(self, directory: str = ".", output_file: str = None) -> str:
        """Generate tree structure for directory"""
        root_path = Path(directory).resolve()

        if not root_path.exists():
            raise ValueError(f"Directory '{directory}' does not exist")

        tree_lines = [f"{root_path.name}/"]
        self._build_tree(root_path, "", tree_lines, depth=0, root=root_path)

        tree_output = "\n".join(tree_lines)

        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(tree_output)
            print(f"✓ Tree structure saved to '{output_file}'")
            print(f"✓ Total lines: {len(tree_lines)}")

        return tree_output

    def _build_tree(self, path: Path, prefix: str, lines: List[str], depth: int, root: Path):
        """Recursively build tree structure"""
        if self.max_depth and depth >= self.max_depth:
            return

        try:
            contents = sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower()))
            contents = [item for item in contents if not self._should_exclude(item, root)]
        except PermissionError:
            return

        for i, item in enumerate(contents):
            is_last = i == len(contents) - 1

            # Choose the appropriate tree characters
            if is_last:
                current_prefix = "└── "
                next_prefix = "    "
            else:
                current_prefix = "├── "
                next_prefix = "│   "

            # Add directory indicator
            display_name = item.name + "/" if item.is_dir() else item.name
            lines.append(f"{prefix}{current_prefix}{display_name}")

            # Recurse into directories
            if item.is_dir():
                self._build_tree(item, prefix + next_prefix, lines, depth + 1, root)


def main():
    """Main function to run the tree generator"""
    import argparse

    parser = argparse.ArgumentParser(
        description='Generate directory tree structure (optimized for React Native/Expo)',
        epilog='''
Examples:
  python tree_gen.py                          # Current directory
  python tree_gen.py -o project-tree.txt      # Save to file
  python tree_gen.py --max-depth 3            # Limit depth to 3 levels
  python tree_gen.py --ext .ts .tsx .js       # Only TypeScript/JavaScript files
  python tree_gen.py --include-images         # Include image files
        ''',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )

    parser.add_argument('directory', nargs='?', default='.',
                        help='Directory to generate tree for (default: current directory)')
    parser.add_argument('-o', '--output', help='Output file (default: print to console)')
    parser.add_argument('--max-depth', type=int, help='Maximum depth to traverse')
    parser.add_argument('--ext', nargs='+', help='Include only these extensions (e.g., .py .js .ts)')
    parser.add_argument('--exclude-dirs', nargs='+', help='Additional directories to exclude')
    parser.add_argument('--exclude-files', nargs='+', help='Additional files to exclude')
    parser.add_argument('--include-images', action='store_true',
                        help='Include image files (png, jpg, etc.)')
    parser.add_argument('--minimal', action='store_true',
                        help='Minimal mode: only source code files (.ts, .tsx, .js, .jsx, .json)')

    args = parser.parse_args()

    # Build custom config from arguments
    config = {}

    if args.max_depth:
        config['max_depth'] = args.max_depth

    if args.ext:
        config['include_extensions'] = args.ext

    if args.minimal:
        config['include_extensions'] = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md']

    if args.exclude_dirs:
        config['exclude_dirs'] = TreeGenerator.DEFAULT_CONFIG['exclude_dirs'] + args.exclude_dirs

    if args.exclude_files:
        config['exclude_files'] = TreeGenerator.DEFAULT_CONFIG['exclude_files'] + args.exclude_files

    if not args.include_images:
        # Add image extensions to exclude patterns
        image_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico']
        config['exclude_patterns'] = TreeGenerator.DEFAULT_CONFIG['exclude_patterns'] + image_extensions

    generator = TreeGenerator(config=config)

    print(f"Generating tree for: {args.directory}")
    if args.minimal:
        print("Mode: Minimal (source code only)")
    print("-" * 50)

    tree = generator.generate_tree(args.directory, args.output)

    if not args.output:
        print(tree)


if __name__ == "__main__":
    main()
"""
Convenience launcher for Jansen Gas Optimization & Business Report
Usage:
    python run.py
"""
import subprocess
import sys
import os

if __name__ == '__main__':
    script_path = os.path.join(os.path.dirname(__file__), 'jansen_gas_optimization.py')
    print("=" * 70)
    print("   LAUNCHING JANSEN GAS BUSINESS REPORT & OPTIMIZATION MODEL")
    print("=" * 70)
    sys.exit(subprocess.call([sys.executable, script_path]))

import json
import csv
import io
import html as html_lib
from typing import Dict, Any, Optional, Tuple, List
from app.database import query_one, query_all

class ReportService:
    @staticmethod
    def generate_block_report(block_height_or_hash: str, fmt: str = "json") -> Tuple[str, str]:
        """
        Returns (content_string, media_type)
        """
        # Fetch block
        if block_height_or_hash.isdigit():
            block = query_one("SELECT * FROM blocks WHERE height = ?", (int(block_height_or_hash),))
        else:
            block = query_one("SELECT * FROM blocks WHERE hash = ?", (block_height_or_hash,))

        if not block:
            raise ValueError("Block not found")

        txs = query_all("SELECT txid, amount_btc, fee_btc, input_count, output_count, is_coinbase FROM transactions WHERE block_hash = ? LIMIT 500", (block["hash"],))
        stats = query_one("SELECT * FROM block_statistics WHERE block_hash = ?", (block["hash"],))

        data = {
            "report_title": f"Bitcoin Block Intelligence Report - Block #{block['height']}",
            "block_metadata": block,
            "statistics": {
                "top_addresses": json.loads(stats["top_addresses_json"]) if stats else [],
                "volume_distribution": json.loads(stats["volume_distribution_json"]) if stats else [],
                "in_out_totals": json.loads(stats["in_out_totals_json"]) if stats else {}
            },
            "analyzed_transactions_sample": txs
        }

        if fmt == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["REPORT", f"Bitcoin Block Intelligence Report - Block #{block['height']}"])
            writer.writerow(["Block Height", block["height"]])
            writer.writerow(["Block Hash", block["hash"]])
            writer.writerow(["Timestamp", block["timestamp"]])
            writer.writerow(["Total Transactions", block["tx_count"]])
            writer.writerow(["Analyzed Transactions", block["analyzed_tx_count"]])
            writer.writerow(["Coverage %", f"{block['coverage_pct']}%"])
            writer.writerow(["Total Volume BTC", block["total_volume_btc"]])
            writer.writerow(["Total Fees BTC", block["total_fees_btc"]])
            writer.writerow(["Processing Time Sec", block["total_time_sec"]])
            writer.writerow([])
            writer.writerow(["ANALYZED TRANSACTIONS"])
            writer.writerow(["TXID", "Amount BTC", "Fee BTC", "Inputs", "Outputs", "Coinbase"])
            for t in txs:
                writer.writerow([t["txid"], t["amount_btc"], t["fee_btc"], t["input_count"], t["output_count"], t["is_coinbase"]])
            return output.getvalue(), "text/csv"

        elif fmt == "html":
            safe_hash = html_lib.escape(str(block["hash"]))
            safe_height = html_lib.escape(str(block["height"]))
            tx_rows = ''.join([f"<tr><td class='mono'>{html_lib.escape(str(t['txid']))}</td><td>{t['amount_btc']}</td><td>{t['fee_btc']}</td><td>{t['input_count']}</td><td>{t['output_count']}</td></tr>" for t in txs[:100]])
            html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Bitcoin Block #{safe_height} Intelligence Report</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; background: #070A12; color: #E2E8F0; padding: 40px; }}
        h1 {{ color: #F7931A; margin-bottom: 5px; }}
        .meta {{ color: #94A3B8; font-size: 14px; margin-bottom: 25px; }}
        .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }}
        .card {{ background: #0F172A; border: 1px solid #1E293B; border-radius: 8px; padding: 15px; }}
        .card-label {{ font-size: 12px; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.05em; }}
        .card-val {{ font-size: 20px; font-weight: bold; margin-top: 5px; color: #38BDF8; }}
        table {{ width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }}
        th, td {{ padding: 10px 12px; border: 1px solid #1E293B; text-align: left; }}
        th {{ background: #111A2E; color: #F7931A; }}
        tr:nth-child(even) {{ background: #0B1120; }}
        .mono {{ font-family: monospace; }}
    </style>
</head>
<body>
    <h1>BITCOIN BLOCK INTELLIGENCE REPORT</h1>
    <div class="meta">Block Height: <strong>#{safe_height}</strong> | Hash: <span class="mono">{safe_hash}</span> | Status: Verified Real Blockchain Data</div>
    
    <div class="grid">
        <div class="card"><div class="card-label">Total Transactions</div><div class="card-val">{block['tx_count']:,}</div></div>
        <div class="card"><div class="card-label">Analyzed Coverage</div><div class="card-val">{block['analyzed_tx_count']:,} ({block['coverage_pct']}%)</div></div>
        <div class="card"><div class="card-label">Total Volume</div><div class="card-val">{block['total_volume_btc']} BTC</div></div>
        <div class="card"><div class="card-label">Total Fees</div><div class="card-val">{block['total_fees_btc']} BTC</div></div>
    </div>

    <h2>Analyzed Transactions ({len(txs)})</h2>
    <table>
        <thead>
            <tr>
                <th>TXID</th>
                <th>Amount (BTC)</th>
                <th>Fee (BTC)</th>
                <th>Inputs</th>
                <th>Outputs</th>
            </tr>
        </thead>
        <tbody>
            {tx_rows}
        </tbody>
    </table>
</body>
</html>"""
            return html, "text/html"

        return json.dumps(data, indent=2), "application/json"

    @staticmethod
    def generate_address_report(address: str, fmt: str = "json") -> Tuple[str, str]:
        activities = query_all("SELECT * FROM address_activity WHERE address = ? ORDER BY id DESC LIMIT 200", (address,))
        followed = query_one("SELECT * FROM followed_addresses WHERE address = ?", (address,))
        events = query_all("SELECT * FROM follow_up_events WHERE address = ? ORDER BY id DESC", (address,))

        data = {
            "address": address,
            "monitoring_status": "Followed" if followed else "Not Followed",
            "followed_record": followed,
            "detection_events": events,
            "recent_activities": activities
        }

        if fmt == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["ADDRESS REPORT", address])
            writer.writerow(["Status", "Followed" if followed else "Not Followed"])
            writer.writerow([])
            writer.writerow(["Block Height", "Timestamp", "Direction", "Amount BTC", "TXID"])
            for a in activities:
                writer.writerow([a["block_height"], a["timestamp"], a["direction"], a["amount_btc"], a["txid"]])
            return output.getvalue(), "text/csv"

        if fmt == "html":
            safe_address = html_lib.escape(address)
            activity_rows = "".join(
                f"<tr><td>{a['block_height']}</td><td>{a['timestamp']}</td>"
                f"<td>{html_lib.escape(str(a['direction']))}</td><td>{a['amount_btc']}</td>"
                f"<td class='mono'>{html_lib.escape(str(a['txid']))}</td></tr>"
                for a in activities[:100]
            )
            return f"""<!doctype html><html><head><meta charset='utf-8'><title>Bitcoin Address Dossier</title>
<style>body{{font-family:monospace;background:#070A12;color:#E2E8F0;padding:32px}}h1{{color:#F7931A}}table{{border-collapse:collapse;width:100%}}th,td{{border:1px solid #334155;padding:8px;text-align:left}}th{{color:#F7931A}}.mono{{font-family:monospace}}</style>
</head><body><h1>BITCOIN ADDRESS DOSSIER</h1><p>Address: <strong>{safe_address}</strong></p>
<p>Status: {html_lib.escape(data['monitoring_status'])}</p><table><thead><tr><th>Block</th><th>Timestamp</th><th>Direction</th><th>Amount BTC</th><th>TXID</th></tr></thead><tbody>{activity_rows}</tbody></table></body></html>""", "text/html"

        return json.dumps(data, indent=2), "application/json"

report_service = ReportService()

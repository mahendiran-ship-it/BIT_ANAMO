import re

BASE58_ADDRESS = re.compile(r"^(1|3)[1-9A-HJ-NP-Za-km-z]{25,34}$")
BECH32_ADDRESS = re.compile(r"^(bc1|tb1)[ac-hj-np-z02-9]{11,87}$", re.IGNORECASE)


def is_valid_bitcoin_address(address: str) -> bool:
    return bool(BASE58_ADDRESS.fullmatch(address) or BECH32_ADDRESS.fullmatch(address))
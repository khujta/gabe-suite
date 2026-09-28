#!/usr/bin/env python3
"""clockbuild.py — build a centre with the CLOCK set to a given day (D-061's byte-stability proof).

    clockbuild.py <generators dir> <YYYY-MM-DD>        (GABE_REPO_ROOT / GABE_SHELL_SRC as for any build)

Every wallclock read the generators make goes through ``datetime.datetime.now`` / ``datetime.date.today`` (``import
datetime as _dt`` everywhere), so both are replaced — before the build is imported — by a clock that reads 10:00 UTC of
the given day. Two runs a day apart over the same tree must write the same board (D-062: and the same index, test
corpora and run history — datefix.py --runs): whatever still differs was written
from the clock (the regen stamp, an absolute run time, is the one field the baseline normaliser strips).
"""
import datetime as _real
import runpy
import sys

gens, day = sys.argv[1], sys.argv[2]
_RD, _RDATE = _real.datetime, _real.date
_AT = _RD.fromisoformat(day + "T10:00:00+00:00")


class _Clock(_RD):
    @classmethod
    def now(cls, tz=None):
        return _AT.astimezone(tz) if tz is not None else _AT.astimezone().replace(tzinfo=None)

    @classmethod
    def utcnow(cls):
        return _AT.replace(tzinfo=None)

    @classmethod
    def today(cls):
        return cls.now()


class _Day(_RDATE):
    @classmethod
    def today(cls):
        return _AT.date()


_real.datetime, _real.date = _Clock, _Day
sys.path.insert(0, gens)
sys.argv = [gens + "/build_center_a3.py"]
runpy.run_path(gens + "/build_center_a3.py", run_name="__main__")
